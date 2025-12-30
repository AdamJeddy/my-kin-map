# My Kin Map
## Why I Built This

I couldn't find a family tree solution that met my needs: completely free, fully secure, and with complete data ownership. Most existing tools either charge money, store your sensitive family information on their servers, or make it difficult to export your data. 

**My Kin Map is different.** Everything runs in your browser. Your family data never leaves your device it's stored locally using IndexedDB. You have complete control over your information, and you can export it anytime for backup or future use.

**Live Demo:** [https://my-kin-map.vercel.app/](https://my-kin-map.vercel.app/)

## Features

- **Interactive Family Tree** - Visualize your family structure with an interactive, zoomable canvas
- **Person Management** - Add, edit, and manage individual family members
- **Relationship Tracking** - Define spouse, parent, and child relationships
- **Smart Layout** - Automatic hierarchical layout with compound couple nodes for married pairs
- **Local Storage** - Data persists in your browser with IndexedDB
- **GEDCOM Import** - Import family trees from standard GEDCOM files
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **React** 18.3 with TypeScript
- **React Flow** - Interactive node/edge canvas for graph visualization
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Dexie.js** - IndexedDB wrapper for local data persistence
- **Radix UI** - Accessible component library

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AdamJeddy/my-kin-map.git
cd my-kin-map
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

## Usage

### Creating a Family Tree

1. **Add People** - Use the "Add Person" button to create family members
2. **Link Relationships** - Connect people with spouse, parent, and child relationships
3. **View Tree** - The tree automatically layouts as you add relationships
4. **Zoom & Pan** - Use mouse wheel to zoom, click and drag to pan around the tree

### Your Data is Safe

All information is stored locally in your browser's storage. No data is sent to any server. When you close the app, your data remains on your device, ready for your next visit.

## Project Structure

```
src/
├── components/
│   ├── tree/              # Family tree visualization
│   │   ├── FamilyTreeView.tsx    # Main tree component
│   │   ├── PersonNode.tsx        # Individual person node
│   │   ├── CoupleNode.tsx        # Married couple compound node
│   │   └── layout.ts             # Tree layout algorithm
│   ├── form/              # Data entry forms
│   └── ui/                # Reusable UI components
├── lib/
│   ├── db.ts              # IndexedDB schema and operations
│   ├── gedcom.ts          # GEDCOM import/export
│   └── utils.ts           # Utility functions
├── types/
│   └── index.ts           # TypeScript type definitions
└── App.tsx                # Main app component
```

## Development

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Data Format

The app stores family data with the following structure:

```typescript
interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  spouseIds: string[];
  parentIds: string[];
  childIds: string[];
}
```

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## Roadmap

- [ ] Multi-device sync
- [ ] Collaborative editing
- [ ] Photo gallery for family members
- [ ] Timeline view
- [ ] Mobile app

## Support

For issues, questions, or feedback, please open an issue on GitHub or reach out through the contact form on the live site.

---

Made by Adam with ❤️ for family historians
