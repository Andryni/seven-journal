import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, TradingAccount, UserGoals, TradingPlanChecklist } from '../lib/authSchemas';
import { supabase } from '../lib/supabase';

interface AuthState {
    currentUser: User | null;
    accounts: TradingAccount[];
    goals: UserGoals[];
    checklists: TradingPlanChecklist[];
    isLoading: boolean;
    accessToken: string | null;

    register: (username: string, email: string, password: string) => Promise<{ error: any }>;
    login: (email: string, password: string) => Promise<{ error: any }>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => Promise<{ error: any }>;

    fetchProfile: (userId: string) => Promise<void>;
    fetchAccounts: (userId: string) => Promise<void>;

    addAccount: (account: Omit<TradingAccount, 'id' | 'createdAt'>) => Promise<{ error: any }>;
    updateAccount: (id: string, updates: Partial<TradingAccount>) => Promise<{ error: any }>;
    deleteAccount: (id: string) => Promise<{ error: any }>;
    setActiveAccount: (id: string) => Promise<void>;

    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            accounts: [],
            goals: [],
            checklists: [],
            isLoading: true,
            accessToken: null,

            initialize: async () => {
                const url = import.meta.env.VITE_SUPABASE_URL;
                console.log('--- Supabase Diagnostic ---');
                console.log('Supabase URL:', url ? `${url.substring(0, 15)}...` : 'MISSING');
                console.log('---------------------------');

                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    set({ accessToken: session.access_token });
                    await get().fetchProfile(session.user.id);
                    await get().fetchAccounts(session.user.id);
                }
                set({ isLoading: false });

                supabase.auth.onAuthStateChange(async (event: any, session: any) => {
                    console.log('Auth state change event:', event, 'User ID:', session?.user?.id);
                    if (session?.user) {
                        set({ accessToken: session.access_token });
                        // Force clearing accounts to avoid showing data from a previous user
                        set({ accounts: [] });
                        await get().fetchProfile(session.user.id);
                        await get().fetchAccounts(session.user.id);
                    } else {
                        set({ currentUser: null, accounts: [], accessToken: null, goals: [], checklists: [] });
                    }
                    set({ isLoading: false });
                });
            },

            fetchProfile: async (userId) => {
                console.log('Fetching profile for:', userId);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) {
                    console.warn('Profile fetch error or missing:', error.message);
                    // Fallback: If profile record is missing in DB, use Auth data to populate currentUser
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (authUser && authUser.id === userId) {
                        console.log('Recovering user state from Auth session');
                        set({
                            currentUser: {
                                id: authUser.id,
                                username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
                                email: authUser.email || '',
                                passwordHash: '',
                                preferredLanguage: 'fr',
                                theme: 'dark',
                                activeAccountId: null,
                                createdAt: authUser.created_at
                            }
                        });
                        return;
                    }
                    set({ currentUser: null });
                } else if (data) {
                    set({
                        currentUser: {
                            id: data.id,
                            username: data.username,
                            email: data.email,
                            passwordHash: '', // Not used anymore
                            preferredLanguage: data.preferred_language,
                            theme: data.theme,
                            activeAccountId: data.active_account_id,
                            createdAt: data.created_at
                        }
                    });
                }
            },

            fetchAccounts: async (userId) => {
                const { data, error } = await supabase
                    .from('trading_accounts')
                    .select('*')
                    .eq('user_id', userId);

                if (error) console.error('Error fetching accounts:', error);
                if (data && !error) {
                    set({
                        accounts: data.map((a: any) => ({
                            id: a.id,
                            userId: a.user_id,
                            name: a.name,
                            initialCapital: parseFloat(a.initial_capital),
                            currentBalance: parseFloat(a.current_balance),
                            currency: a.currency,
                            type: a.type,
                            broker: a.broker,
                            metaapiAccountId: a.metaapi_account_id,
                            createdAt: a.created_at
                        }))
                    });
                }
            },

            register: async (username, email, password) => {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username } }
                });

                if (error) return { error };
                if (data.user) {
                    // Profile is created via trigger normally, but we can also do it here if trigger not setup
                    const { error: profileError } = await supabase.from('profiles').insert({
                        id: data.user.id,
                        username,
                        email
                    });
                    if (profileError) {
                        console.error('Profile creation error:', profileError);
                        // If profile already exists, it's fine
                        if (profileError.code !== '23505') return { error: profileError };
                    }

                    // Supabase auto-logins after signUp unless email confirmation is ON.
                    // Let's ensure we have the local data ready.
                    await get().fetchProfile(data.user.id);
                }
                return { error: null };
            },

            login: async (email, password) => {
                try {
                    console.log('Attempting login for:', email);
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                    if (error) {
                        console.error('Supabase login error:', error);
                        return { error };
                    }

                    if (data.user) {
                        console.log('Login successful, fetching data for:', data.user.id);
                        await Promise.all([
                            get().fetchProfile(data.user.id),
                            get().fetchAccounts(data.user.id)
                        ]);
                    }
                    return { error: null };
                } catch (err: any) {
                    console.error('Unexpected login error:', err);
                    return { error: err };
                }
            },

            logout: async () => {
                await supabase.auth.signOut();
                set({ currentUser: null, accounts: [], goals: [], checklists: [] });
            },

            updateUser: async (updates) => {
                const user = get().currentUser;
                if (!user) return { error: 'No user to update' };

                const dbUpdates: any = {};
                if (updates.username) dbUpdates.username = updates.username;
                if (updates.preferredLanguage) dbUpdates.preferred_language = updates.preferredLanguage;
                if (updates.theme) dbUpdates.theme = updates.theme;
                if (updates.activeAccountId !== undefined) dbUpdates.active_account_id = updates.activeAccountId;

                const { error } = await supabase
                    .from('profiles')
                    .update(dbUpdates)
                    .eq('id', user.id);

                if (!error) {
                    set({ currentUser: { ...user, ...updates } });
                }
                return { error };
            },

            addAccount: async (accountData) => {
                const user = get().currentUser;
                // Get config from environment
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                if (!user) return { error: { message: 'No user authenticated' } };

                try {
                    console.log('--- MT5 Account Insertion (DIRECT FETCH) ---');

                    const token = get().accessToken;
                    if (!token) {
                        console.warn('No accessToken in store, attempting one-time fallback fetch...');
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.access_token) throw new Error('No active session token. Please logout and login again.');
                        set({ accessToken: session.access_token });
                    }

                    const payload = {
                        user_id: user.id,
                        name: accountData.name,
                        initial_capital: accountData.initialCapital,
                        current_balance: accountData.currentBalance,
                        currency: accountData.currency || 'USD',
                        type: accountData.type,
                        broker: accountData.broker
                    };

                    console.log('Target URL:', `${supabaseUrl}/rest/v1/trading_accounts`);

                    const response = await fetch(`${supabaseUrl}/rest/v1/trading_accounts`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseAnonKey,
                            'Authorization': `Bearer ${token || get().accessToken}`,
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(payload)
                    });

                    console.log('Fetch status:', response.status);

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Database Direct Error:', errorText);
                        throw new Error(`Database Error (${response.status}): ${errorText}`);
                    }

                    const data = await response.json();
                    const newRow = data?.[0];

                    if (newRow) {
                        console.log('Account created successfully via Fetch:', newRow.id);
                        const newAcc: TradingAccount = {
                            id: newRow.id,
                            userId: newRow.user_id,
                            name: newRow.name,
                            initialCapital: parseFloat(newRow.initial_capital),
                            currentBalance: parseFloat(newRow.current_balance),
                            currency: newRow.currency,
                            type: newRow.type,
                            broker: newRow.broker,
                            metaapiAccountId: newRow.metaapi_account_id,
                            createdAt: newRow.created_at
                        };
                        set(state => ({ accounts: [...state.accounts, newAcc] }));
                        if (!user.activeAccountId) {
                            await get().setActiveAccount(newRow.id);
                        }
                        return { error: null };
                    }

                    return { error: { message: 'Account created but server returned no data' } };
                } catch (err: any) {
                    console.error('Unexpected error in addAccount:', err);
                    return { error: { message: err.message || 'Unknown database error' } };
                }
            },

            updateAccount: async (id, updates) => {
                const dbUpdates: any = {};
                if (updates.name) dbUpdates.name = updates.name;
                if (updates.initialCapital !== undefined) dbUpdates.initial_capital = updates.initialCapital;
                if (updates.currentBalance !== undefined) dbUpdates.current_balance = updates.currentBalance;
                if (updates.currency) dbUpdates.currency = updates.currency;
                if (updates.type) dbUpdates.type = updates.type;
                if (updates.broker) dbUpdates.broker = updates.broker;

                const { error } = await supabase
                    .from('trading_accounts')
                    .update(dbUpdates)
                    .eq('id', id);

                if (!error) {
                    set(state => ({
                        accounts: state.accounts.map(a => a.id === id ? { ...a, ...updates } : a)
                    }));
                }
                return { error };
            },

            deleteAccount: async (id) => {
                const { error } = await supabase
                    .from('trading_accounts')
                    .delete()
                    .eq('id', id);

                if (!error) {
                    set(state => ({
                        accounts: state.accounts.filter(a => a.id !== id),
                        currentUser: state.currentUser?.activeAccountId === id
                            ? { ...state.currentUser, activeAccountId: null }
                            : state.currentUser
                    }));
                }
                return { error };
            },

            setActiveAccount: async (id) => {
                await get().updateUser({ activeAccountId: id });
            }
        }),
        {
            name: 'seven-journal-auth',
        }
    )
);
