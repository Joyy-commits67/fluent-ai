import { supabase } from './supabase';

interface LibraryEntry {
  wordOrPhrase: string;
  contextSentence?: string;
  category: string;
}

// 1. Adds a fresh word, phrase, or question topic to your history tracker vault
export async function addWordToLibrary(userId: string, entry: LibraryEntry) {
  const cleanWord = entry.wordOrPhrase.toLowerCase().trim();
  if (!cleanWord) return;

  // Check if it already exists so we don't pollute your database with duplicates
  const { data: existing } = await supabase
    .from('vocabulary_library')
    .select('id')
    .eq('user_id', userId)
    .eq('word_or_phrase', cleanWord)
    .maybeSingle();

  if (!existing) {
    const { data, error } = await supabase
      .from('vocabulary_library')
      .insert([
        {
          user_id: userId,
          word_or_phrase: cleanWord,
          context_sentence: entry.contextSentence || '',
          category: entry.category,
          next_review_at: new Date(Date.now() + 86400000).toISOString(), // Schedule review bump for tomorrow
        },
      ]);

    if (error) console.error('Library insert fault:', error.message);
    return { data, error };
  }
}

// 2. Pulls all items a user has already encountered so we can isolate them
export async function getLearnedItems(userId: string, category?: string) {
  let query = supabase
    .from('vocabulary_library')
    .select('word_or_phrase')
    .eq('user_id', userId);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error querying vocabulary loop arrays:', error.message);
    return [];
  }
  return data ? data.map((item) => item.word_or_phrase) : [];
}
