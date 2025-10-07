import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { recipeId, userPrompt } = await request.json();

    if (!recipeId || !userPrompt) {
      return NextResponse.json(
        { error: 'Recipe ID and user prompt are required' },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch the base recipe
    const { data: baseRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !baseRecipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Ensure ingredients and instructions are arrays
    const ingredients = Array.isArray(baseRecipe.ingredients) ? baseRecipe.ingredients : [];
    const instructions = Array.isArray(baseRecipe.instructions) ? baseRecipe.instructions : [];

    // Prepare the prompt for OpenAI
    const systemPrompt = `You are a helpful cooking assistant. You will be given a recipe and a user request to modify it. Return ONLY a valid JSON object with the modified recipe. Do not include any other text or explanations.

The JSON should have this exact structure:
{
  "title": "Recipe Title",
  "description": "Brief description",
  "ingredients": [
    {"name": "ingredient name", "quantity": "amount", "unit": "unit"}
  ],
  "instructions": [
    {"step": 1, "instruction": "Step description"}
  ],
  "prep_time": 15,
  "cook_time": 30,
  "servings": 4
}`;

    const userPromptText = `Base Recipe:
Title: ${baseRecipe.title}
Description: ${baseRecipe.description || 'No description'}

Ingredients:
${ingredients.map((ing: any) => `- ${ing.quantity || ''} ${ing.unit || ''} ${ing.name || ''}`).join('\n')}

Instructions:
${instructions.map((inst: any) => `${inst.step || ''}. ${inst.instruction || ''}`).join('\n')}

User Request: ${userPrompt}

Please modify the recipe according to the user's request and return the complete modified recipe as JSON.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptText }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let modifiedRecipe;
    try {
      modifiedRecipe = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid response format from AI');
    }

    // Save the modified recipe to the database
    const { data: savedRecipe, error: saveError } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title: modifiedRecipe.title || baseRecipe.title,
        description: modifiedRecipe.description || baseRecipe.description,
        ingredients: modifiedRecipe.ingredients || ingredients,
        instructions: modifiedRecipe.instructions || instructions,
        prep_time: modifiedRecipe.prep_time || baseRecipe.prep_time,
        cook_time: modifiedRecipe.cook_time || baseRecipe.cook_time,
        servings: modifiedRecipe.servings || baseRecipe.servings,
        image_url: baseRecipe.image_url,
        image_urls: baseRecipe.image_urls,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving modified recipe:', saveError);
      throw new Error('Failed to save modified recipe');
    }

    return NextResponse.json({
      success: true,
      recipe: savedRecipe,
      message: 'Recipe modified successfully'
    });

  } catch (error) {
    console.error('AI recipe modification error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to modify recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}