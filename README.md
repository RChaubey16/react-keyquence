# React Keyquence

A lightweight React component that listens for keyboard sequences (like the classic Konami code) and triggers callbacks with optional audio feedback. Perfect for adding Easter eggs to your React applications!

## Installation

```bash
pnpm add react-keyquence
```

or

```bash
npm install react-keyquence
```

or

```bash
yarn add react-keyquence
```

## Usage

```tsx
import Keyquence from 'react-keyquence';

function App() {
  return (
    <>
      <Keyquence
        sequences={[
          {
            keys: 'hello',
            onDetect: () => console.log('Hello sequence detected!'),
            audioPath: '/sounds/hello.mp3' // optional
          },
          {
            keys: 'secret',
            onDetect: () => alert('You found the secret!'),
          }
        ]}
        resetTimeout={2000} // optional, defaults to 2000ms
      />
      
      <div>Your app content here</div>
    </>
  );
}
```

## API

### Props

#### `sequences` (required)
An array of sequence objects to listen for.

Each sequence object has:
- `keys` (string): The keyboard sequence to detect (case-insensitive)
- `onDetect` (function): Callback function to execute when the sequence is detected
- `audioPath` (string, optional): Path to an audio file to play when the sequence is detected

#### `resetTimeout` (optional)
Time in milliseconds before the typed sequence resets. Default: `2000`

## Examples

### Classic Konami Code

```tsx
<Keyquence
  sequences={[
    {
      keys: 'arrowuparrowuparrowdownarrowdownarrowleftarrowrightarrowleftarrowrightba',
      onDetect: () => {
        console.log('Konami code activated! 🎮');
        // Activate your Easter egg here
      },
      audioPath: '/sounds/power-up.mp3'
    }
  ]}
/>
```

### Multiple Sequences

```tsx
<Keyquence
  sequences={[
    {
      keys: 'debug',
      onDetect: () => setDebugMode(true)
    },
    {
      keys: 'party',
      onDetect: () => startConfetti(),
      audioPath: '/sounds/party.mp3'
    },
    {
      keys: 'reset',
      onDetect: () => resetApp()
    }
  ]}
  resetTimeout={3000}
/>
```

### With Next.js

Make sure to use the component in a client component:

```tsx
'use client';

import Keyquence from 'keyquence';

export default function ClientComponent() {
  return (
    <Keyquence
      sequences={[
        {
          keys: 'nextjs',
          onDetect: () => console.log('Next.js rocks!')
        }
      ]}
    />
  );
}
```

## Features

- 🎯 Detect custom keyboard sequences
- 🔊 Optional audio feedback
- ⚡ Lightweight and performant
- 🎨 TypeScript support
- ♻️ Automatic cleanup
- 🔄 Configurable reset timeout
- 📦 Works with any React framework (Next.js, Vite, CRA, etc.)

## How It Works

The component listens to keyboard events globally and builds up a sequence of typed keys. When the typed sequence matches any of the configured sequences, it triggers the corresponding callback and optionally plays audio.

The sequence automatically resets after the specified timeout period (default: 2 seconds) of inactivity.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
