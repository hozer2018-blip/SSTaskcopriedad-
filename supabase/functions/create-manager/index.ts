import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { propertyId, fullName, documentId, licenseNumber, email, educationLevel, hasManager } = await req.json()

    const tempPassword = 'SSTask2026*'
    let userId = null

    // Check if user already exists
    const { data: existingUsers, error: searchError } = await supabaseClient.auth.admin.listUsers()
    if (searchError) throw searchError
    
    const existingUser = existingUsers.users.find(u => u.email === email)
    
    if (existingUser) {
      userId = existingUser.id
      // Update password to the temp one if they already existed
      await supabaseClient.auth.admin.updateUserById(userId, { password: tempPassword })
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true // Auto-confirm
      })
      if (createError) throw createError
      userId = newUser.user.id
    }

    // Insert/Update in sst_managers
    if (hasManager) {
      const { error: updateError } = await supabaseClient
        .from('sst_managers')
        .update({
          full_name: fullName,
          document_id: documentId,
          license_number: licenseNumber,
          email: email,
          education_level: educationLevel,
          account_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('property_id', propertyId)
        
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabaseClient
        .from('sst_managers')
        .insert({
          property_id: propertyId,
          full_name: fullName,
          document_id: documentId,
          license_number: licenseNumber,
          email: email,
          education_level: educationLevel,
          account_id: userId
        })
        
      if (insertError) throw insertError
    }

    // Upsert into profiles to ensure 'Responsable' role
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert([
        { id: userId, email: email, role: 'Responsable' }
      ])
      
    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ success: true, message: "Responsable asignado correctamente." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Error asignando responsable:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
