/**
 * categories.ts
 *
 * The 7 expense categories shown in the Add Expense screen.
 * Each has a label, a Material Icons name, and a Firestore key (no spaces).
 *
 * Icon names come from @expo/vector-icons → MaterialIcons.
 * (installed in Step 2 along with the main icon package)
 */

export type CategoryKey =
  | 'Food'
  | 'Travel'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Education'
  | 'Other';

export interface Category {
  key:   CategoryKey;
  label: string;
  icon:  string;   // MaterialIcons name
}

export const CATEGORIES: Category[] = [
  { key: 'Food',          label: 'Food',          icon: 'restaurant'        },
  { key: 'Travel',        label: 'Travel',         icon: 'directions-car'    },
  { key: 'Shopping',      label: 'Shop',           icon: 'shopping-bag'      },
  { key: 'Bills',         label: 'Bills',          icon: 'receipt-long'      },
  { key: 'Entertainment', label: 'Entertain',      icon: 'movie'             },
  { key: 'Education',     label: 'Edu',            icon: 'school'            },
  { key: 'Other',         label: 'Other',          icon: 'more-horiz'        },
];

// Quick lookup by key
export const CATEGORY_MAP: Record<CategoryKey, Category> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c])
) as Record<CategoryKey, Category>;
