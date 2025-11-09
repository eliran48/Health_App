import React, { useState, useEffect, useCallback } from 'react';
import type { Recipe } from '../types';
import { db } from '../services/firebase';
import { 
    collection, 
    query, 
    orderBy, 
    getDocs, 
    doc, 
    updateDoc, 
    addDoc, 
    deleteDoc 
} from 'firebase/firestore';

interface RecipeManagerProps {
  uid: string;
}

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25-1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
);


export default function RecipeManager({ uid }: RecipeManagerProps) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [formState, setFormState] = useState({ name: '', ingredients: '', instructions: '' });
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const recipesCol = collection(db, 'users', uid, 'recipes');

    const loadRecipes = useCallback(async () => {
        if (!uid) return;
        setLoading(true);
        try {
            const q = query(recipesCol, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const loadedRecipes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Recipe));
            setRecipes(loadedRecipes);
        } catch (e) {
            console.error(e);
            setError('שגיאה בטעינת המתכונים.');
        } finally {
            setLoading(false);
        }
    }, [uid]);

    useEffect(() => {
        loadRecipes();
    }, [loadRecipes]);

    const resetForm = () => {
        setFormState({ name: '', ingredients: '', instructions: '' });
        setEditingRecipeId(null);
        setIsFormVisible(false);
        setError('');
    };

    const handleAddNew = () => {
        setSelectedRecipe(null);
        setEditingRecipeId(null);
        setFormState({ name: '', ingredients: '', instructions: '' });
        setIsFormVisible(true);
    };
    
    const handleEdit = (recipe: Recipe) => {
        setSelectedRecipe(null);
        setEditingRecipeId(recipe.id);
        setFormState({ name: recipe.name, ingredients: recipe.ingredients, instructions: recipe.instructions });
        setIsFormVisible(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid) return;
        if (!formState.name) {
            setError('יש למלא שם מתכון.');
            return;
        }
        setSaving(true);
        setError('');

        try {
            if (editingRecipeId) {
                // Update existing recipe
                const recipeDoc = doc(db, 'users', uid, 'recipes', editingRecipeId);
                await updateDoc(recipeDoc, formState);
            } else {
                // Add new recipe
                const newRecipe: Omit<Recipe, 'id'> = {
                    ...formState,
                    createdAt: new Date().toISOString(),
                };
                await addDoc(recipesCol, newRecipe);
            }
            resetForm();
            loadRecipes();
        } catch (e) {
            console.error(e);
            setError('שגיאה בשמירת המתכון.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!uid) return;
        if (window.confirm('האם למחוק את המתכון?')) {
            try {
                const docToDelete = doc(db, 'users', uid, 'recipes', id);
                await deleteDoc(docToDelete);
                loadRecipes();
                if (selectedRecipe?.id === id) {
                    setSelectedRecipe(null);
                }
            } catch (e) {
                console.error(e);
                setError('שגיאה במחיקת המתכון.');
            }
        }
    };
    
    const ViewPanel = () => (
        <div className="p-4 md:p-6 h-full">
            {selectedRecipe ? (
                 <div>
                    <h3 className="text-2xl font-bold text-gray-800 break-words">{selectedRecipe.name}</h3>
                    <div className="mt-6">
                        <h4 className="font-bold text-gray-700 mb-2">מצרכים</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{selectedRecipe.ingredients}</p>
                    </div>
                     <div className="mt-6">
                        <h4 className="font-bold text-gray-700 mb-2">הוראות הכנה</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{selectedRecipe.instructions}</p>
                    </div>
                 </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <p>בחר מתכון מהרשימה כדי לצפות בו,</p>
                    <p>או הוסף מתכון חדש.</p>
                </div>
            )}
        </div>
    );
    
    const FormPanel = () => (
        <div className="p-4 md:p-6 h-full bg-gray-50/50">
             <form onSubmit={handleSave}>
                <h3 className="text-2xl font-bold text-gray-800 mb-6">{editingRecipeId ? 'עריכת מתכון' : 'הוספת מתכון חדש'}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">שם המתכון</label>
                        <input type="text" id="name" value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} className="w-full border-gray-300 rounded-xl px-3 py-2" required/>
                    </div>
                     <div>
                        <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700 mb-1">מצרכים</label>
                        <textarea id="ingredients" rows={5} value={formState.ingredients} onChange={e => setFormState({...formState, ingredients: e.target.value})} className="w-full border-gray-300 rounded-xl px-3 py-2" placeholder="כל מצרך בשורה חדשה..."/>
                    </div>
                     <div>
                        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">הוראות הכנה</label>
                        <textarea id="instructions" rows={8} value={formState.instructions} onChange={e => setFormState({...formState, instructions: e.target.value})} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                <div className="mt-6 flex gap-2">
                    <button type="submit" disabled={saving} className="bg-black text-white px-6 py-2 rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-400">
                        {saving ? 'שומר...' : 'שמור מתכון'}
                    </button>
                    <button type="button" onClick={resetForm} className="border border-gray-300 px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100">
                        ביטול
                    </button>
                </div>
             </form>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-lg">
            <div className="p-6 border-b">
                 <h2 className="text-xl font-bold text-gray-800">ניהול מתכונים</h2>
                 <p className="text-sm text-gray-600">שמור וערוך את המתכונים הבריאים שלך במקום אחד.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
                <div className="md:col-span-1 border-r flex flex-col">
                    <div className="p-4 border-b">
                        <button onClick={handleAddNew} className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-black transition-colors text-sm flex items-center justify-center gap-2">
                            <PlusIcon />
                            הוסף מתכון חדש
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading && <p className="p-4 text-center text-gray-500">טוען מתכונים...</p>}
                        {!loading && recipes.length === 0 && <p className="p-4 text-center text-gray-500">אין עדיין מתכונים.</p>}
                        <ul>
                            {recipes.map(recipe => (
                                <li key={recipe.id} className={`border-b ${selectedRecipe?.id === recipe.id ? 'bg-gray-100' : ''}`}>
                                    <div className="flex items-center justify-between p-4">
                                        <button onClick={() => { setSelectedRecipe(recipe); setIsFormVisible(false); }} className="text-right flex-1 truncate pr-2 hover:text-black">
                                            {recipe.name}
                                        </button>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <button onClick={() => handleEdit(recipe)} className="text-gray-500 hover:text-black" aria-label={`Edit ${recipe.name}`}><EditIcon /></button>
                                            <button onClick={() => handleDelete(recipe.id)} className="text-gray-500 hover:text-red-600" aria-label={`Delete ${recipe.name}`}><DeleteIcon /></button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="md:col-span-2">
                    {isFormVisible ? <FormPanel /> : <ViewPanel />}
                </div>
            </div>
        </div>
    );
}
