import { useAuthStore } from '../store/useAuthStore';
import { translations } from '../lib/translations';
import type { TranslationKeys } from '../lib/translations';

export function useTranslation() {
    const preferredLanguage = useAuthStore(state => state.currentUser?.preferredLanguage) || 'en';
    const t = (translations[preferredLanguage as keyof typeof translations] || translations.en) as TranslationKeys;

    return { t, lang: preferredLanguage };
}
