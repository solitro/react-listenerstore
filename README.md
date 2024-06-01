# react-listenerstore

A lightweight global state management solution for React applications with support for nested state and listeners.

## Features

- **Nested state management**: Manage deeply nested state structures.
- **Global state store**: Create and access multiple named stores globally.
- **Listeners**: Register listeners to state changes at any level.
- **React Hooks**: Integrate seamlessly with React using hooks.

## Installation

To install the module, you can use npm or yarn:

```sh
npm install react-listenerstore
# or
yarn add react-listenerstore
```

## Usage
1. `Creating a Store` - To create a store, use the \`createListenerStore\` function. Provide a unique namespace and the initial state.

```typescript
// store.ts
import { createListenerStore } from 'react-listenerstore';

const { useListener, setListenerStore } = createListenerStore('myNamespace', {
  a: 1,
  b: {
    c: 2,
    d: 3
  }
});
```
1. `Using the Store in a Component` - Use the \`useListener\` hook to access and update the store within your components.

```tsx
import React from 'react';
import { useListener } from './store.ts';

const MyComponent = () => {
  const [ aValue, setAValue ] = useListener('a');
  const [ bCValue, setBCValue ] = useListener('b.c');

  return (
    <div>
      <div>
        A Value: {aValue}
        <button onClick={() => setAValue((prev) => prev + 1)}>Increment A</button>
      </div>
      <div>
        B.C Value: {bCValue}
        <button onClick={() => setBCValue(bCValue + 1)}>Increment B.C</button>
      </div>
    </div>
  );
};

export default MyComponent;
```
3. `Updating the Store Outside of Components` - Use the setListenerStore function to update the store outside of a component.

```typescript
import { setListenerStore } from './store.ts';

// Update store directly
setListenerStore('a', 10);

// Update store using a function
setListenerStore('b.c', (currentValue) => currentValue + 5);
```

## API
#### `createListenerStore(namespace: string, initialState: T)`
Creates a new global store.

**Parameters**
`namespace (string)`: A unique name for the store.
`initialState (T)`: The initial state object.
**Returns**
`useListener`: A hook to access and update the store within components.
`setListenerStore`: A function to update the store outside of components.

#### `useListener(key: K)`
A React hook to access and update the store.

**Parameters**
`key (K)`: The key to access in the store. Supports nested keys (e.g., a, b.c).
**Returns**
`data`: The current value at the specified key.
set: A function to update the value at the specified key.
`set(data: P | ((data: P) => P))`: Updates the key's value in the store.

#### License
This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

#### Contribution
Feel free to open issues or submit pull requests if you have any improvements or bug fixes.

#### Acknowledgements
Thanks to the open-source community for continuous inspiration and support.
