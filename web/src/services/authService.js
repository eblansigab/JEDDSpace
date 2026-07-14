import { supabaseClient, signupClient } from '../supabase/supabaseClient';

const USE_TWO_FACTOR = true;
export const isTwoFactorEnabled = USE_TWO_FACTOR;
const TWO_FA_STORAGE_KEY = 'jeddspace_2fa_pending';
const PENDING_EMPLOYEE_KEY = 'jeddspace_pending_employee';

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

const savePendingEmployee = (payload) => {
  try {
    localStorage.setItem(PENDING_EMPLOYEE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save pending employee data:', e);
  }
};

const loadPendingEmployee = () => {
  try {
    const raw = localStorage.getItem(PENDING_EMPLOYEE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearPendingEmployee = () => localStorage.removeItem(PENDING_EMPLOYEE_KEY);

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/;

const normalizeUsername = (username) => {
  const trimmed = String(username || '').trim();

  if (!trimmed) {
    throw new Error('Username is required.');
  }

  if (trimmed.length < 3 || trimmed.length > 30) {
    throw new Error('Username must be between 3 and 30 characters.');
  }

  if (!USERNAME_PATTERN.test(trimmed)) {
    throw new Error('Username can only contain letters, numbers, and underscores.');
  }

  return trimmed.toLowerCase();
};

export const validateUsername = (username) => normalizeUsername(username);

export const isUsernameAvailable = async (username) => {
  const normalizedUsername = validateUsername(username);

  const { data, error } = await supabaseClient
    .from('employee')
    .select('employee_id')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (error) throw error;

  return !data;
};

export const getEmployeeEmailByUsername = async (username) => {
  const normalizedUsername = validateUsername(username);

  try {
    const { data, error } = await supabaseClient
      .from('employee')
      .select('email, username')
      .eq('username', normalizedUsername)
      .maybeSingle();

    if (!error && data?.email) {
      return data.email;
    }
  } catch (error) {
    console.warn('[authService] Browser username lookup failed; trying API fallback.', error);
  }

  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'resolve-username',
      username: normalizedUsername,
    }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.email) {
    return null;
  }

  return result.email;
};

export const getPendingEmployee = () => loadPendingEmployee();

export const clearPendingEmployeeData = () => clearPendingEmployee();

/**
 * Creates the employee record after the user has verified their email.
 * Called from AuthCallbackPage when verification succeeds.
 */
export const createEmployeeRecord = async (authUserId, employeeData) => {
  if (!authUserId) {
    throw new Error('Auth user ID is required to create employee record.');
  }

  if (!employeeData) {
    throw new Error('Employee data is required.');
  }

  const { data: existing, error: checkError } = await supabaseClient
    .from('employee')
    .select('employee_id')
    .eq('user_id', authUserId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking existing employee:', checkError);
  }

  if (existing) {
    return existing;
  }

  const fallbackFirstName = employeeData.firstName || employeeData.email?.split('@')[0] || 'Unknown'
  const fallbackLastName = employeeData.lastName || 'User'
  const roleName = String(employeeData.role || '').toLowerCase() === 'admin' ? 'admin' : 'employee'

  let roleId = null
  try {
    const { data: roleRow } = await supabaseClient
      .from('roles')
      .select('role_id')
      .eq('role_name', roleName)
      .maybeSingle()
    roleId = roleRow?.role_id || null
  } catch {
    // proceed without role_id if lookup fails
  }

  const { data, error: insertError } = await supabaseClient
    .from('employee')
    .insert([
      {
        first_name: fallbackFirstName,
        last_name: fallbackLastName,
        position: employeeData.position || 'employee',
        department: employeeData.department || 'general',
        employee_type: employeeData.employeeType || 'staff',
        role: roleName,
        role_id: roleId,
        user_id: authUserId,
        email: employeeData.email,
        username: employeeData.username || null,
      },
    ])
    .select()
    .single();

  if (insertError) throw insertError;
  return data;
};

export const registerUser = async (
  email,
  password,
  confirmPassword,
  firstName,
  lastName,
  position,
  role,
  department,
  username
) => {
  const normalizedUsername = validateUsername(username);

  if (password.trim() !== confirmPassword.trim()) {
    throw new Error('Passwords do not match.')
  }

  const available = await isUsernameAvailable(normalizedUsername);
  if (!available) {
    throw new Error('Username is already taken.');
  }

  const { data, error } = await signupClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }



  const authUserId = data?.user?.id;

  if (authUserId) {
    try {
      const fallbackFirstName = firstName || email.split('@')[0] || 'Unknown'
      const fallbackLastName = lastName || 'User'
      const roleName = String(role || '').toLowerCase() === 'admin' ? 'admin' : 'employee'

      let roleId = null
      try {
        const { data: roleRow } = await supabaseClient
          .from('roles')
          .select('role_id')
          .eq('role_name', roleName)
          .maybeSingle()
        roleId = roleRow?.role_id || null
      } catch {
        // proceed without role_id if lookup fails
      }

      const { data, error: insertError } = await supabaseClient
        .from('employee')
        .insert([
          {
            first_name: fallbackFirstName,
            last_name: fallbackLastName,
            position,
            department,
            employee_type: 'staff',
            role: roleName,
            role_id: roleId,
            user_id: authUserId,
            email,
            username: normalizedUsername,
          },
        ])
        .select()
        .single();

      const createdEmployee = data;

      if (!insertError && createdEmployee) {
        clearPendingEmployee();
        return { ...data, employeeCreated: true };
      }

      if (insertError) {
        console.warn(
          '[registerUser] Immediate employee insert failed (likely FK timing with email confirmation). Will retry after verification.',
          insertError
        );
      }
    } catch (e) {
      console.warn('[registerUser] Immediate employee insert threw error, falling back to post-verification creation:', e);
    }
  } else {
    console.warn('[registerUser] No authUserId returned from signUp. This usually means Confirm Email is enabled and the user is pending verification.');
  }

  savePendingEmployee({
    email,
    username: normalizedUsername,
    firstName: firstName || email.split('@')[0] || 'Unknown',
    lastName: lastName || 'User',
    position: position || 'employee',
    department: department || 'general',
    employeeType: 'staff',
    role: String(role || '').toLowerCase() === 'admin' ? 'admin' : 'employee',
    createdAt: Date.now(),
  });

  return { ...data, employeeCreated: false, pendingEmployee: true };
};

export const loginUser = async (email, password) => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
};

export const loginWithUsername = async (username, password) => {
  try {
    const normalizedUsername = validateUsername(username);
    const email = await getEmployeeEmailByUsername(normalizedUsername);

    if (!email) {
      throw new Error('Invalid username or password.');
    }

    return await loginUser(email, password);
  } catch (error) {
    throw new Error('Invalid username or password.', { cause: error });
  }
};

export const beginTwoFactorSignIn = async (username, password) => {
  if (!USE_TWO_FACTOR) {
    return await loginWithUsername(username, password);
  }

  let email;
  try {
    email = await getEmployeeEmailByUsername(username);
  } catch (error) {
    throw new Error('Invalid username or password.', { cause: error });
  }

  if (!email) {
    throw new Error('Invalid username or password.');
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error('Invalid username or password.');

  const code = generate2FACode();
  const pending = {
    userId: data.user?.id,
    email,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  savePending2FA(pending);
  return { data, code };
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

export const resendVerficationEmail = async () => {
  const { data, error } = await supabaseClient.auth.resend({
    type: 'signup',
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error
  return data
};
