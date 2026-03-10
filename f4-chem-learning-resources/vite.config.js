import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        chemicalBonding: 'chemical-bonding.html',
        neutralizationExothermic: 'neutralization-exothermic.html',
        titration: 'titration.html',
        saltQuiz: 'salt-page.html',
      },
    },
  },
});
