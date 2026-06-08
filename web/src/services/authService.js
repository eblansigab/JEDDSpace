import { supabaseClient } from '../supabase/supabaseClient';

const USE_TWO_FACTOR = true;
export const isTwoFactorEnabled = USE_TWO_FACTOR;
const TWO_FA_STORAGE_KEY = 'jeddspace_2fa_pending';

const generate2FACode = () => Math.floor(100000 + Math.random() * 900000).toString();
const savePending2FA = (payload) => localStorage.setItem(TWO_FA_STORAGE_KEY, JSON.stringify(payload));
const loadPending2FA = () => {
  const raw = localStorage.getItem(TWO_FA_STORAGE_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const clearPending2FA = () => localStorage.removeItem(TWO_FA_STORAGE_KEY);

export const registerUser = async (
  email,
  password,
  confirmPassword,
  firstName,
  lastName,
  position,
  role,
  department
) => {
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match.');
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const { error: insertError } = await supabaseClient.from('employee').insert([
    {
      first_name: firstName,
      last_name: lastName,
      position,
      department,
      role: String(role || '').toLowerCase() === 'admin' ? 'admin' : 'employee',
      user_id: data.user.id,
    },
  ]);

  if (insertError) throw insertError;

  return data;
};

export const loginUser = async (email, password) => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
};


export const beginTwoFactorSignIn = async (email, password) => {
  if (!USE_TWO_FACTOR) {
    return await loginUser(email, password);
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const code = generate2FACode();
  const pending = {
    userId: data.user?.id,
    email,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  savePending2FA(pending);
  return { data, code, email };
};

export const getPendingTwoFactor = () => loadPending2FA();

export const verifyTwoFactorCode = async (code) => {
  const pending = loadPending2FA();
  if (!pending) {
    throw new Error('No pending 2FA session found. Please log in again.');
  }

  if (Date.now() > pending.expiresAt) {
    clearPending2FA();
    throw new Error('The verification code has expired. Please log in again.');
  }

  if (pending.code !== code) {
    throw new Error('Invalid verification code.');
  }

  clearPending2FA();
  return pending;
};

export const resendTwoFactorCode = () => {
  const pending = loadPending2FA();
  if (!pending) {
    throw new Error('No pending 2FA session found. Please log in again.');
  }

  const code = generate2FACode();
  const updatedPending = {
    ...pending,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  savePending2FA(updatedPending);
  return updatedPending;
};

export const logoutUser = async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;

  clearPending2FA();
  return true;
};

export const logoutAllDevices = async () => {
  const { error } = await supabaseClient.auth.signOut({
    scope: 'global',
  });
  if (error) throw error;

  clearPending2FA();
  return true;
};

export const updateUserPassword = async (newPassword) => {
  const { data, error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
};


