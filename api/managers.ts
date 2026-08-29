import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

export default async function handler(req: any, res: any) {
  // Solo aceptamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Missing Supabase configuration" });
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Recibimos la contraseña desde el formulario
    const { 
      propertyId, 
      fullName, 
      documentId, 
      licenseNumber, 
      email, 
      educationLevel,
      hasManager,
      password
    } = req.body;

    let userId = null;

    // Check if user already exists
    const { data: existingUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    if (searchError) throw searchError;
    
    const existingUser = existingUsers.users.find(u => u.email === email);
    
    if (existingUser) {
      userId = existingUser.id;
      // Actualizamos con la contraseña que escribió el administrador
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: password });
    } else {
      // Creamos usuario nuevo con la contraseña del formulario
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });
      
      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // 2. Insert/Update in sst_managers
    if (hasManager) {
      // Update existing manager for this property
      const { error: updateError } = await supabaseAdmin
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
        .eq('property_id', propertyId);
        
      if (updateError) throw updateError;
    } else {
      // Insert new manager
      const { error: insertError } = await supabaseAdmin
        .from('sst_managers')
        .insert({
          property_id: propertyId,
          full_name: fullName,
          document_id: documentId,
          license_number: licenseNumber,
          email: email,
          education_level: educationLevel,
          account_id: userId
        });
        
      if (insertError) throw insertError;
    }

    // 3. Upsert into profiles to ensure 'Responsable' role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert([
        { id: userId, email: email, role: 'Responsable' }
      ]);
      
    if (profileError) throw profileError;

    return res.status(200).json({ success: true, message: "Responsable asignado correctamente." });

  } catch (error: any) {
    console.error("Error asignando responsable:", error);
    return res.status(500).json({ error: error.message || "Error interno del servidor" });
  }
}
