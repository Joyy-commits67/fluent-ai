import { supabase } from './supabase'; // Connects directly to your existing config client

interface AppErrorItem {
  incorrectText: string;
  correctText: string;
  explanation: string;
  category: 'grammar' | 'vocabulary' | 'pronunciation';
}

export async function saveUserError(userId: string, errorData: AppErrorItem) {
  const { data, error } = await supabase
    .from('user_errors')
    .insert([
      {
        user_id: userId,
        incorrect_text: errorData.incorrectText,
        correct_text: errorData.correctText,
        explanation: errorData.explanation,
        category: errorData.category,
      },
    ]);

  if (error) {
    console.error('Error logging user error:', error.message);
  }
  return { data, error };
}
