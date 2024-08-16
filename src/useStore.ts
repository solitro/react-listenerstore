import { useMemo, useSyncExternalStore } from "react";
import { shallowCopy } from "./shallowCopy";
import { deprecate } from "util";

export type NestedRecord = Record<string, any>;

export type NestedKey<T> =
	| {
			[K in keyof T & (string | number)]: T[K] extends Array<any>
				? `${K}`
				: T[K] extends Map<any, any>
				? `${K}`
				: T[K] extends Function
				? `${K}`
				: T[K] extends object
				? `${K}` | `${K}.${NestedKey<T[K]>}`
				: `${K}`;
	  }[keyof T & (string | number)];

export type NestedValue<T, K = undefined> = K extends undefined
	? T
	: K extends `${infer P}.${infer R}`
	? P extends keyof T
		? R extends NestedKey<T[P]>
			? NestedValue<T[P], R>
			: never
		: never
	: K extends keyof T
	? T[K]
	: never;

export type Listener = () => void;

export type ListenersRecord<T> = {
	listeners: Listener[];
	children: {
		[K in keyof T]?: T[K] extends object
			? ListenersRecord<T[K]>
			: ListenersRecord<T[K]>;
	};
};

export type GlobalListenerStoreType<T extends NestedRecord> = Record<
	string,
	ListenersRecord<T>
>;

export type GlobalDataStoreEntryType = NestedRecord;
export type GlobalDataStoreType = Record<string, GlobalDataStoreEntryType>;

const listenersRecord: ListenersRecord<NestedRecord> = {
	listeners: [],
	children: {},
};

let globalListenerStore: GlobalListenerStoreType<NestedRecord> = {};

let globalDataStore: GlobalDataStoreType = {};

type Namespace = keyof typeof globalListenerStore;

const allListeners: Record<Namespace, Listener[]> = {};

const getCurrentStore = <T extends NestedRecord, K extends NestedKey<T>>(
	nameSpace: Namespace,
	key?: K,
) => {
	let currentDataStore = globalDataStore[nameSpace];
	if (!key) {
		return currentDataStore;
	}
	const keyParts = key.split(".");
	let currentKey = keyParts.shift();
	while (currentKey) {
		if (keyParts.length > 0 && !currentDataStore[currentKey]) {
			currentDataStore[currentKey] = {};
		}
		currentDataStore = currentDataStore[currentKey] as NestedRecord;
		currentKey = keyParts.shift();
	}
	return currentDataStore;
};

const getCurrentStoreParent = <T extends NestedRecord, K extends NestedKey<T>>(
	nameSpace: Namespace,
	key?: K,
) => {
	if (!key) {
		return globalDataStore;
	}
	const keyParts = key.split(".");
	let currentDataStore = globalDataStore[nameSpace];
	keyParts.pop();
	let currentKey = keyParts.shift();
	while (currentKey) {
		currentDataStore = currentDataStore[currentKey] as NestedRecord;
		currentKey = keyParts.shift();
	}
	return currentDataStore;
};

const getCurrentListenerStore = <
	T extends NestedRecord,
	K extends NestedKey<T>,
>(
	nameSpace: Namespace,
	key?: K,
) => {
	const externalListenerStore = globalListenerStore?.[nameSpace] || {
		listeners: [...listenersRecord.listeners],
		children: { ...listenersRecord.children },
	};
	globalListenerStore[nameSpace] = externalListenerStore;
	if (!key) {
		return externalListenerStore;
	}
	const keyParts = key.split(".");
	let currentKey = keyParts.shift();
	let currentListenerStore = externalListenerStore;
	while (currentKey) {
		const nextStore = currentListenerStore.children?.[currentKey] || {
			listeners: [...listenersRecord.listeners],
			children: { ...listenersRecord.children },
		};
		if (!currentListenerStore.children?.[currentKey]) {
			currentListenerStore.children[currentKey] = nextStore;
		}
		currentListenerStore = nextStore;
		currentKey = keyParts.shift();
	}
	return currentListenerStore;
};

const addListenerToStore = <T extends NestedRecord, K extends NestedKey<T>>(
	listener: Listener | Listener[],
	nameSpace: Namespace,
	key?: K,
) => {
	// step through each store and
	listener = Array.isArray(listener) ? listener : [listener];
	allListeners[nameSpace] = [
		...new Set([...(allListeners?.[nameSpace] || []), ...listener]),
	];
	const keys = key?.split(".") || [];
	let currentListenerStore =
		shallowCopy(globalListenerStore[nameSpace]) || shallowCopy(listenersRecord);
	globalListenerStore[nameSpace] = currentListenerStore;
	let listeners = currentListenerStore.listeners;
	currentListenerStore.listeners = [...new Set([...listeners, ...listener])];
	for (const key of keys) {
		let nextStore = currentListenerStore.children?.[key] || {
			...listenersRecord,
		};
		currentListenerStore.children[key] = nextStore;
		listeners = nextStore.listeners;
		nextStore.listeners = [...new Set([...listeners, ...listener])];
		currentListenerStore = nextStore;
	}
	globalListenerStore = { ...globalListenerStore };
};

const removeListenerFromStore = <
	T extends NestedRecord,
	K extends NestedKey<T>,
>(
	listener: Listener,
	nameSpace: Namespace,
	key?: K,
) => {
	allListeners[nameSpace] = allListeners[nameSpace].filter(
		(l) => l !== listener,
	);
	const keys = key?.split(".") || [];
	let currentListenerStore =
		shallowCopy(globalListenerStore[nameSpace]) || shallowCopy(listenersRecord);
	globalListenerStore[nameSpace] = currentListenerStore;
	currentListenerStore.listeners = currentListenerStore.listeners.filter(
		(l) => l !== listener,
	);
	for (const key of keys) {
		let nextStore = currentListenerStore.children?.[key] || {
			...listenersRecord,
		};
		currentListenerStore.children[key] = nextStore;
		nextStore.listeners = nextStore.listeners.filter((l) => l !== listener);
		currentListenerStore = nextStore;
	}
	globalListenerStore = { ...globalListenerStore };
};

const subscribe = <T extends NestedRecord, K extends NestedKey<T>>(
	listener: Listener,
	nameSpace: Namespace,
	key?: K,
) => {
	addListenerToStore(listener, nameSpace, key);
	return () => {
		removeListenerFromStore(listener, nameSpace, key);
	};
};

const getSnapshot = <T>(nameSpace: string, key?: string) => {
	const store = getCurrentStore(nameSpace, key);
	// if (!store) {
	// 	throw new Error(`Key not found in ${nameSpace} store`);
	// }
	return store as T;
};

const callListeners = (nameSpace: string, key?: string) => {
	const keys = key?.split(".");
	do {
		const listener = getCurrentListenerStore(nameSpace, keys?.join("."));
		const listeners = listener?.listeners;
		listeners?.forEach((listener) => listener());
		keys?.pop();
	} while (keys?.length);
	globalListenerStore[nameSpace].listeners.forEach((listener) => listener());
};

const callAllListeners = (nameSpace: string, key: string = "") => {
	allListeners?.[nameSpace]?.forEach((listener) => listener());
};

const setDataStore = <
	T extends NestedRecord,
	K extends NestedKey<T>,
	P extends NestedValue<T, K>,
>(
	data: P,
	nameSpace: Namespace,
	key?: K,
) => {
	if (key) {
		let parentStore = getCurrentStoreParent(nameSpace, key);
		const keys = key.split(".");
		let currentKey = keys.pop() as string;
		const newValueIsDifferent = !Object.is(parentStore[currentKey], data);
		parentStore[currentKey] = data;
		// set parent stores to new values
		if (newValueIsDifferent) {
			let currentStore = parentStore;
			parentStore = getCurrentStoreParent(nameSpace, keys.join("."));
			do {
				currentKey = keys.pop() as string;
				parentStore[currentKey] = shallowCopy(currentStore);
				currentStore = parentStore;
				parentStore = getCurrentStoreParent(nameSpace, keys.join("."));
			} while (currentKey);
			globalDataStore[nameSpace] = shallowCopy(globalDataStore[nameSpace]);
		}
	} else {
		globalDataStore[nameSpace] = data;
		callAllListeners(nameSpace);
	}
	globalDataStore = { ...globalDataStore };
	callListeners(nameSpace, key);
};

// Type guard for Function
function isFunction<T>(value: unknown): value is (data: T) => T {
	return typeof value === "function";
}

/** Function to create a global store
 * @param nameSpace - The namespace of the store - should be unique
 * @returns {useStore, setDataStore} - The useStore hook and the setDataStore function
 */
const createListenerStore = <T extends NestedRecord>(
	nameSpace: string,
	store: T,
) => {
	const externalDataStore = globalDataStore[nameSpace] || store;
	if (!globalDataStore[nameSpace]) {
		globalDataStore[nameSpace] = externalDataStore;
	}

	/** Function to set the store of this namespace
	 * @param key - The key of the store to be updated
	 * @param data - The new data to set the store to or function to update the store
	 * @returns {void}
	 * This function should be used if data needs to be updated outside of the useStore hook
	 * This function will call all listeners related to the key to update the ui
	 */
	const setListenerStore = (data: T | ((data: T) => T)) => {
		if (isFunction<any>(data)) {
			const newData = data(getSnapshot<T>(nameSpace));
			return setDataStore(newData, nameSpace);
		}
		// this allows ts to compile without errors
		setDataStore(data as any, nameSpace);
	};

	/** Hook to use to create a usable store with a signal to update whenever the value is changed
	 * @param key - The key of the store - should be unique
	 * @param initStore - The initial value of the store if none exists
	 * @returns {data, set} - The data and the set function
	 */
	const useListener = <
		P extends NestedValue<T, K>,
		K extends NestedKey<T> | undefined = undefined,
	>(
		key?: K,
	) => {
		const memoizedSubscribe = useMemo(
			() => (listener: Listener) => subscribe(listener, nameSpace, key),
			[],
		);

		/** Data variable
		 * @type {P}
		 * Holds the data of the store
		 */
		const data = useSyncExternalStore(memoizedSubscribe, () =>
			getSnapshot<P>(nameSpace, key),
		);

		/** Function to set the data of the store
		 * @param data - The new data to set the store to or function to update the store
		 * @returns {void}
		 * Set the store and calls all listeners to update the ui
		 */
		const set = (data: P | ((data: P) => P)) => {
			if (isFunction<any>(data)) {
				const newData = data(getSnapshot<P>(nameSpace, key));
				return setDataStore(newData, nameSpace, key);
			}
			// this allows ts to compile without errors
			setDataStore(data as any, nameSpace, key);
		};

		const store = [data, set] as [P, (data: P | ((data: P) => P)) => void];

		return store;
	};
	const listenerStore = globalDataStore[nameSpace] as T;

	return { useListener, setListenerStore, listenerStore };
};

export { createListenerStore };
