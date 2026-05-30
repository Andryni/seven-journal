import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';
import { nanoid } from 'nanoid';

export interface PlaybookSetup {
    id: string;
    accountId: string;
    name: string;
    description: string;
    rules: string[];
    createdAt: string;
    updatedAt: string;
}

interface PlaybookState {
    setups: PlaybookSetup[];
    
    addSetup: (setup: Omit<PlaybookSetup, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateSetup: (id: string, updates: Partial<PlaybookSetup>) => void;
    deleteSetup: (id: string) => void;
}

export const usePlaybookStore = create<PlaybookState>()(
    persist(
        (set) => ({
            setups: [],

            addSetup: (setupData) => {
                const newSetup: PlaybookSetup = {
                    ...setupData,
                    id: nanoid(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                set((state) => ({ setups: [newSetup, ...state.setups] }));
            },

            updateSetup: (id, updates) => {
                set((state) => ({
                    setups: state.setups.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)
                }));
            },

            deleteSetup: (id) => {
                set((state) => ({
                    setups: state.setups.filter(s => s.id !== id)
                }));
            }
        }),
        {
            name: 'seven-journal-playbook',
            storage: createJSONStorage(() => idbStorage),
        }
    )
);
