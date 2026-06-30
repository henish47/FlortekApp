import { supabase } from './supabase';

export const signUp = async ({
  email,
  password,
  fullName,
  companyName,
  address,
  city,
  state,
  pincode,
  mobile,
}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
        address: address,
        city: city,
        state: state,
        pincode: pincode,
        mobile: mobile,
      },
    },
  });

  console.log('SIGNUP DATA =>', data);
  console.log('SIGNUP ERROR =>', error);

  if (data?.user) {
    console.log('User ID =>', data.user.id);
    console.log('User Email =>', data.user.email);
    console.log('User Email Confirmed At =>', data.user.email_confirmed_at);
    
    // Save all fields into profiles table after account creation (gracefully handled if RLS prevents write before verification)
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: fullName,
          company_name: companyName,
          address: address,
          city: city,
          state: state,
          pincode: pincode,
          email: email,
          mobile: mobile,
          role: 'customer'
        });
      if (profileError) {
        console.log('Direct profile upsert error during registration (this is normal if RLS blocks unconfirmed users):', profileError);
      }
    } catch (profileEx) {
      console.log('Direct profile upsert failed:', profileEx);
    }
  } else {
    console.log('User => null');
  }
  console.log('Session =>', data?.session);

  if (error) throw error;

  return data;
};

export const signIn = async (
  email,
  password
) => {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  return { data, error };
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Supabase signOut returned error (ignoring to allow local signout):', error);
    }
  } catch (err) {
    console.error('Supabase signOut exception (ignoring to allow local signout):', err);
  }
  return true;
};

export const getCurrentUser =
  async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    return user;
  };

export const getUserProfile = async (
  userId
) => {
  const { data, error } =
    await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

  console.log(
    'PROFILE DATA =>',
    data
  );

  if (error) {
    console.log(error);
    throw error;
  }

  return data?.[0] || null;
};

export const sendOTP = async (email) => {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  if (error) throw error;
  return data;
};

export const verifyOTP = async (email, otp) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup',
  });
  if (error) throw error;
  
  return data;
};

export const checkEmailVerificationStatus = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return false;
    return !!(user.email_confirmed_at || user.user_metadata?.email_verified);
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return false;
  }
};
