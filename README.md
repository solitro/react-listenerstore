# Global Store Module

A lightweight, flexible global state management solution for React applications. This module provides a way to create and manage nested global state stores with listener support for updates.

## Features

- **Nested state management**: Manage deeply nested state structures.
- **Global state store**: Create and access multiple named stores globally.
- **Listeners**: Register listeners to state changes at any level.
- **React Hooks**: Integrate seamlessly with React using hooks.

## Installation

To install the module, you can use npm or yarn:

```sh
npm install your-package-name
# or
yarn add your-package-name
```

## Usage
1. `Creating a Store` - To create a store, use the createStore function. Provide a unique namespace and the initial state.

```typescript
import createStore from 'your-package-name';

const { useStore, setStore } = createStore('myNamespace', {
  a: 1,
  b: {
    c: 2,
    d: 3
  }
});
```
2. `Using the Store in a Component` - Use the useStore hook to access and update the store within your components.

```tsx
import React from 'react';
import { useStore } from 'your-package-name';

const MyComponent = () => {
  const { data: aValue, set: setAValue } = useStore('a');
  const { data: bCValue, set: setBCValue } = useStore('b.c');

  return (
    <div>
      <div>
        A Value: {aValue}
        <button onClick={() => setAValue(aValue + 1)}>Increment A</button>
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
3. `Updating the Store Outside of Components` - Use the setStore function to update the store outside of a component.

```typescript
import { setStore } from 'your-package-name';

// Update store directly
setStore('a', 10);

// Update store using a function
setStore('b.c', (currentValue) => currentValue + 5);
```

## API
`createStore(namespace: string, initialState: T)`
Creates a new global store.

**Parameters**
`namespace (string)`: A unique name for the store.
`initialState (T)`: The initial state object.
**Returns**
`useStore`: A hook to access and update the store within components.
`setStore`: A function to update the store outside of components.
`useStore(key: K)`: A React hook to access and update the store.

**Parameters**
`key (K)`: The key to access in the store. Supports nested keys (e.g., a, b.c).
Returns
`data`: The current value at the specified key.
set: A function to update the value at the specified key.
`setStore(key: K, data: P | ((data: P) => P))`: Updates the store outside of components.

**Parameters**
`key (K)`: The key to update in the store. Supports nested keys (e.g., a, b.c).
`data (P | ((data: P) => P))`: The new data to set, or a function that receives the current data and returns the new data.

#### License
This project is licensed under the MIT License. See the LICENSE file for details.

#### Contribution
Feel free to open issues or submit pull requests if you have any improvements or bug fixes.

#### Acknowledgements
Thanks to the open-source community for continuous inspiration and support.

By following this README, users should be able to quickly understand how to install, use, and contribute to your global state management module.

```markdown
### Explanation:

- **Features**: A brief overview of the module's features.
- **Installation**: Instructions on how to install the module.
- **Usage**: Step-by-step guide on how to create a store, use the store in a component, and update the store outside of a component.
- **API**: Detailed explanation of the functions provided by the module (`createStore`, `useStore`, `setStore`).
- **License**: Information about the project's license.
- **Contribution**: Encouragement for users to contribute to the project.
- **Acknowledgements**: Acknowledgement of the open-source community's support. 

This structure helps users understand the purpose and usage of the module and provides a clear reference for the available functions and their usage.
```