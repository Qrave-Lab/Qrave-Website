import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'ml' | 'hi';

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    tContent: (text: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
    en: {
        menu: 'Menu',
        search: 'Search for delicacies...',
        veg: 'VEG',
        add: 'Add',
        soldOut: 'Sold out',
        bestseller: 'Bestseller',
        spicy: 'Spicy',
        unavailable: 'Unavailable',
        viewCart: 'View Cart',
        checkout: 'Checkout',
        total: 'Total',
        table: 'Table',
        arTour: 'AR Menu Walkthrough',
        arTourDesc: 'See dishes on your table before you order.',
        gotIt: 'Got it',
        waiter: 'Waiter',
        water: 'Water',
        waiterCalled: 'Waiter notified',
        waterRequested: 'Water requested',
        immersiveView: 'Swipe View',
        listView: 'List View',
        customise: 'Customise',
        todaysSpecials: "Today's Specials",
        chefSpecials: "Chef's Specials",
        recommended: 'Recommended',
        offerProducts: 'Offers',
    },
    hi: {
        menu: 'मेनू',
        search: 'व्यंजनों की खोज करें...',
        veg: 'शाकाहारी',
        add: 'जोड़ें',
        soldOut: 'बिक गया',
        bestseller: 'लोकप्रिय',
        spicy: 'तीखा',
        unavailable: 'अनुपलब्ध',
        viewCart: 'कार्ट देखें',
        checkout: 'चेकआउट',
        total: 'कुल',
        table: 'मेज',
        arTour: 'एआर टूर',
        arTourDesc: 'ऑर्डर करने से पहले व्यंजन देखें।',
        gotIt: 'समझ गया',
        waiter: 'वेटर',
        water: 'पानी',
        waiterCalled: 'वेटर को सूचित किया',
        waterRequested: 'पानी का अनुरोध किया',
        immersiveView: 'स्वाइप व्यू',
        listView: 'सूची दृश्य',
        customise: 'बदलाव करें',
        todaysSpecials: 'आज की विशेष',
        chefSpecials: 'शेफ की विशेष',
        recommended: 'अनुशंसित',
        offerProducts: 'ऑफर',
    },
    ml: {
        menu: 'മെനു',
        search: 'വിഭവങ്ങൾ തിരയുക...',
        veg: 'വെജ്',
        add: 'ചേർക്കുക',
        soldOut: 'തീർന്നുപോയി',
        bestseller: 'ബെസ്റ്റ് സെല്ലർ',
        spicy: 'എരിവുള്ളത്',
        unavailable: 'ലഭ്യമല്ല',
        viewCart: 'കാർട്ട് കാണുക',
        checkout: 'ചെക്കൗട്ട്',
        total: 'ആകെ',
        table: 'മേശ',
        arTour: 'AR മെനു',
        arTourDesc: 'ഓർഡർ ചെയ്യുന്നതിന് മുമ്പ് വിഭവങ്ങൾ മേശയിൽ കാണുക.',
        gotIt: 'മനസ്സിലായി',
        waiter: 'വെയ്റ്റർ',
        water: 'വെള്ളം',
        waiterCalled: 'വെയ്റ്ററെ വിളിച്ചു',
        waterRequested: 'വെള്ളം ആവശ്യപ്പെട്ടു',
        immersiveView: 'സ്വൈപ്പ് വ്യൂ',
        listView: 'ലിസ്റ്റ് വ്യൂ',
        customise: 'മാറ്റം വരുത്തുക',
        todaysSpecials: 'ഇന്നത്തെ സ്പെഷ്യൽ',
        chefSpecials: 'ഷെഫ്‌സ് സ്പെഷ്യൽ',
        recommended: 'ശുപാർശ',
        offerProducts: 'ഓഫറുകൾ',
    },
};

const dictionary: Record<string, Record<string, string>> = {
    // Meats and Basics
    'chicken': { hi: 'चिकन', ml: 'ചിക്കൻ' },
    'mutton': { hi: 'मटन', ml: 'മട്ടൺ' },
    'beef': { hi: 'बीफ', ml: 'ബീഫ്' },
    'pork': { hi: 'पॉर्क', ml: 'പോർക്ക്' },
    'fish': { hi: 'मछली', ml: 'മീൻ' },
    'prawns': { hi: 'झींगा', ml: 'ചെമ്മീൻ' },
    'shrimp': { hi: 'झींगा', ml: 'ചെമ്മീൻ' },
    'crab': { hi: 'केकड़ा', ml: 'ഞണ്ട്' },
    'egg': { hi: 'अंडा', ml: 'മുട്ട' },

    // Veggies
    'veg': { hi: 'वेज', ml: 'വെജ്' },
    'paneer': { hi: 'पनीर', ml: 'പനീർ' },
    'mushroom': { hi: 'मशरूम', ml: 'കുമിൾ' },
    'potato': { hi: 'आलू', ml: 'കിഴങ്ങ്' },
    'tomato': { hi: 'टमाटर', ml: 'തക്കാളി' },
    'onion': { hi: 'प्याज', ml: 'ഉള്ളി' },
    'gobi': { hi: 'गोभी', ml: 'ഗോബി' },
    'cauliflower': { hi: 'गोभी', ml: 'കോളിഫ്ലവർ' },

    // Carbs
    'rice': { hi: 'राइस', ml: 'റൈസ്' }, // Transliteration often better for menu names like "Fried Rice"
    'biryani': { hi: 'बिरयानी', ml: 'ബിരിയാണി' },
    'pulao': { hi: 'पुलाव', ml: 'പുലാവ്' },
    'mandhi': { hi: 'मंढ़ी', ml: 'മന്തി' },
    'alfaham': { hi: 'अलफहम', ml: 'അൽഫാം' },
    'noodle': { hi: 'नूडल', ml: 'നൂഡിൽസ്' },
    'noodles': { hi: 'नूडल्स', ml: 'നൂഡിൽസ്' },
    'pasta': { hi: 'पास्ता', ml: 'പാസ്ത' },
    'pizza': { hi: 'पिज़्ज़ा', ml: 'പിസ്സ' },
    'burger': { hi: 'बर्गर', ml: 'ബർഗർ' },
    'sandwich': { hi: 'सैंडविच', ml: 'സാൻഡ്‌വിച്ച്' },
    'shawarma': { hi: 'शवरमा', ml: 'ഷവർമ' },
    'porotta': { hi: 'परोठा', ml: 'പൊറോട്ട' },
    'chapati': { hi: 'चपाती', ml: 'ചപ്പാത്തി' },
    'naan': { hi: 'नान', ml: 'നാൻ' },
    'roti': { hi: 'रोटी', ml: 'റൊട്ടി' },

    // Preparations
    'curry': { hi: 'करी', ml: 'കറി' },
    'fry': { hi: 'फ्राई', ml: 'ഫ്രൈ' },
    'roast': { hi: 'रोस्ट', ml: 'റോസ്റ്റ്' },
    'masala': { hi: 'मसाला', ml: 'മസാല' },
    'tikka': { hi: 'टिक्का', ml: 'ടിക്ക' },
    'tandoori': { hi: 'तंदूरी', ml: 'തന്തൂരി' },
    'grilled': { hi: 'ग्रिल्ड', ml: 'ഗ്രിൽഡ്' },
    'barbecue': { hi: 'बारबेक्यू', ml: 'ബാർബിക്യൂ' },
    'bbq': { hi: 'बीबीक्यू', ml: 'ബിബിക്യൂ' },
    'dry': { hi: 'ड्राई', ml: 'ഡ്രൈ' },
    'gravy': { hi: 'ग्रेवी', ml: 'ഗ്രേവി' },
    'butter': { hi: 'बटर', ml: 'ബട്ടർ' },
    'chilly': { hi: 'चिली', ml: 'ചില്ലി' },
    'manchurian': { hi: 'मंचूरियन', ml: 'മഞ്ചൂരിയൻ' },

    // Categories / Types
    'soup': { hi: 'सूप', ml: 'സൂപ്പ്' },
    'salad': { hi: 'सलाद', ml: 'സാലഡ്' },
    'starter': { hi: 'स्टार्टर', ml: 'സ്റ്റാർട്ടർ' },
    'starters': { hi: 'स्टार्टर्स', ml: 'സ്റ്റാർട്ടേഴ്സ്' },
    'main': { hi: 'मेन', ml: 'മെയിൻ' },
    'dessert': { hi: 'डेजर्ट', ml: 'ഡെസേർട്ട്' },
    'beverage': { hi: 'बेवरेज', ml: 'പാനീയങ്ങൾ' },
    'drinks': { hi: 'ड्रिंक्स', ml: 'ഡ്രിങ്ക്സ്' },
    'juice': { hi: ' जूस', ml: 'ജ്യൂസ്' },
    'shake': { hi: 'शेक', ml: 'ഷേക്ക്' },
    'tea': { hi: 'चाय', ml: 'ചായ' },
    'coffee': { hi: 'कॉफी', ml: 'കോഫി' },
    'water': { hi: 'पानी', ml: 'വെള്ളം' },
    'soda': { hi: 'सोडा', ml: 'സോഡ' },
    'lime': { hi: 'लाइम', ml: 'ലൈം' },
    'mint': { hi: 'मिंट', ml: 'പുതിന' },

    // Attributes
    'spicy': { hi: 'स्पाइसी', ml: 'സ്പൈസി' },
    'crispy': { hi: 'क्रिस्पी', ml: 'ക്രിസ്പി' },
    'sweet': { hi: 'स्वीट', ml: 'മധുരമുള്ള' },
    'hot': { hi: 'हॉट', ml: 'ചൂടുള്ള' },
    'cold': { hi: 'कोल्ड', ml: 'തണുത്ത' },
    'special': { hi: 'स्पेशल', ml: 'സ്പെഷ്യൽ' },

    // Sizes
    'regular': { hi: 'रेगुलर', ml: 'റെഗുലർ' },
    'small': { hi: 'स्माल', ml: 'ചെറുത്' },
    'medium': { hi: 'मीडियम', ml: 'മീഡിയം' },
    'large': { hi: 'लार्ज', ml: 'വലുത്' },
    'full': { hi: 'फुल', ml: 'ഫുൾ' },
    'half': { hi: 'हाफ', ml: 'ഹാഫ്' },
    'plate': { hi: 'प्लेट', ml: 'പ്ലേറ്റ്' },
    'bowl': { hi: 'बाउल', ml: 'ബൗൾ' },
    'cup': { hi: 'कप', ml: 'കപ്പ്' }
};

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set, get) => ({
            language: 'en',
            setLanguage: (lang) => set({ language: lang }),
            t: (key) => {
                const lang = get().language;
                return translations[lang]?.[key] || translations['en'][key] || key;
            },
            tContent: (text) => {
                if (!text) return "";
                const lang = get().language;
                if (lang === 'en') return text;

                // Split by space but preserve punctuation
                return text.split(/(\s+|(?=[.,!?])|(?<=[.,!?]))/).map(part => {
                    if (!part.trim()) return part;
                    if (/^[.,!?]+$/.test(part)) return part;

                    const key = part.toLowerCase().replace(/[^a-z0-9]/g, '');

                    if (!key) return part;

                    // Direct lookup
                    const trans = dictionary[key]?.[lang];
                    if (trans) {
                        const isCap = part[0] === part[0].toUpperCase();
                        // Simple capitalization for scripts that support it (not really HI/ML but good for consistency)
                        return trans;
                    }

                    // Singular check
                    if (part.endsWith('s') || part.endsWith('S')) {
                        const keyS = key.slice(0, -1);
                        const transS = dictionary[keyS]?.[lang];
                        if (transS) {
                            return transS;
                        }
                    }

                    return part;
                }).join('');
            },
        }),
        {
            name: 'language-storage',
        }
    )
);
