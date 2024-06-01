import { useMemo, useSyncExternalStore } from "react";

type NestedRecord = Record<string, any>;
type NestedKey<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKey<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

type NestedValue<T, K extends string> = K extends `${infer P}.${infer R}`
  ? P extends keyof T
    ? R extends NestedKey<T[P]>
      ? NestedValue<T[P], R>
      : never
    : never
  : K extends keyof T
  ? T[K]
  : never;

type Listener = () => void;
type ListenersRecord<T> = {
  listeners: Listener[];
  children: {
    [K in keyof T]?: T[K] extends object
      ? ListenersRecord<T[K]>
      : ListenersRecord<T[K]>;
  };
};
const listenersRecord: ListenersRecord<NestedRecord> = {
  listeners: [],
  children: {},
};
type GlobalListenerStoreEntryType<T> = ListenersRecord<T>;
type GlobalListenerStoreType<T extends NestedRecord> = Record<
  string,
  GlobalListenerStoreEntryType<T>
>;
let globalListenerStore: GlobalListenerStoreType<NestedRecord> = {};

export type GlobalDataStoreEntryType = NestedRecord;
export type GlobalDataStoreType = Record<string, GlobalDataStoreEntryType>;
let globalDataStore: GlobalDataStoreType = {};

type Namespace = keyof typeof globalListenerStore;

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

const setListenerStore = <T extends NestedRecord, K extends NestedKey<T>>(
  listener: Listener | Listener[],
  nameSpace: Namespace,
  key?: K,
) => {
  const currentListenerStore = getCurrentListenerStore(nameSpace, key);
  const listeners = currentListenerStore?.listeners || [];
  listener = Array.isArray(listener) ? listener : [listener];
  currentListenerStore.listeners = [...listeners, ...listener];
  globalListenerStore = { ...globalListenerStore };
};

const subscribe = <T extends NestedRecord, K extends NestedKey<T>>(
  listener: Listener,
  nameSpace: Namespace,
  key?: K,
) => {
  setListenerStore(listener, nameSpace, key);
  return () => {
    const listenerStore = getCurrentListenerStore(nameSpace, key);
    listenerStore.listeners = listenerStore.listeners.filter(
      (l) => l !== listener,
    );
    setListenerStore(listenerStore.listeners, nameSpace, key);
  };
};

const getSnapshot = <T>(nameSpace: string, key?: string) => {
  const store = getCurrentStore(nameSpace, key);
  if (!store) {
    throw new Error(`Key not found in ${nameSpace} store`);
  }
  return store as T;
};

const callListeners = (nameSpace: string, key?: string) => {
  const listener = getCurrentListenerStore(nameSpace, key);
  const listeners = listener?.listeners;
  console.log(`calling ${listeners?.length} listeners`);
  listeners?.forEach((listener) => listener());
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
    const lastKey = key.split(".").pop() as string;
    parentStore[lastKey] = data;
  } else {
    globalDataStore[nameSpace] = data;
  }
  globalDataStore = { ...globalDataStore };
  callListeners(nameSpace, key);
};

/** Function to create a global store
 * @param nameSpace - The namespace of the store - should be unique
 * @returns {useStore, setDataStore} - The useStore hook and the setDataStore function
 */
const createStore = <T extends NestedRecord>(nameSpace: string, store: T) => {
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
  const setStore = <K extends NestedKey<T>, P extends NestedValue<T, K>>(
    data: P | ((data: P) => P),
    key?: K,
  ) => {
    if (data instanceof Function) {
      const newData = data(getSnapshot<P>(nameSpace, key));
      setDataStore(newData, nameSpace, key);
      return;
    }
    setDataStore(data, nameSpace, key);
  };

  /** Hook to use to create a usable store with a signal to update whenever the value is changed
   * @param key - The key of the store - should be unique
   * @param initStore - The initial value of the store
   * @returns {data, set} - The data and the set function
   */
  const useStore = <K extends NestedKey<T>, P extends NestedValue<T, K>>(
    key: K,
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
      if (data instanceof Function) {
        const newData = data(getSnapshot(nameSpace, key));
        setDataStore(newData, nameSpace, key);
        return;
      }
      setDataStore(data, nameSpace, key);
    };

    const store = [data, set] as [P, (data: P | ((data: P) => P)) => void];

    return store;
  };

  return { useStore, setStore };
};

export default createStore;
