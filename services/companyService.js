import { supabase } from './supabase';

const BUCKET = 'company-assets';

/**
 * Fetches the singleton company profile row.
 */
export const getCompanyProfile = async () => {
  const { data, error } = await supabase
    .from('company_profile')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Inserts or updates the company profile.
 * Uses upsert — if a row exists, update it; otherwise insert.
 */
export const upsertCompanyProfile = async (profileData, existingId = null) => {
  if (existingId) {
    const { data, error } = await supabase
      .from('company_profile')
      .update(profileData)
      .eq('id', existingId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('company_profile')
      .insert(profileData)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};

/**
 * Uploads company logo to Supabase Storage and returns the public URL.
 * @param {string} localUri - Local file URI from ImagePicker
 * @returns {string} Public URL of the uploaded logo
 */
export const uploadCompanyLogo = async (localUri) => {
  // Read file as blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  let ext = 'jpg';
  if (blob.type) {
    ext = blob.type.split('/').pop()?.toLowerCase() || 'jpg';
    if (ext === 'jpeg') ext = 'jpg'; // normalize jpeg to jpg
  } else {
    ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  }
  const filename = `company-logo-${Date.now()}.${ext}`;
  const contentType = blob.type || (ext === 'png' ? 'image/png' : 'image/jpeg');

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, blob, {
      contentType,
      upsert: true,
    });

  if (error) throw error;

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return publicData.publicUrl;
};
