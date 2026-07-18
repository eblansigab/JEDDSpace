import { supabaseClient, signupClient } from '../supabase/supabaseClient';
import { getDepartmentForRole } from '../utils/roleMetadata';

const PENDING_EMPLOYEE_KEY = 'jeddspace_pending_employee';

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
  const roleName = String(employeeData.position || employeeData.role || 'employee').trim() || 'employee'
  const derivedDepartment = getDepartmentForRole(roleName, employeeData.department || 'General')

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
        position: roleName,
        department: derivedDepartment,
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

  let authUserId = null
  let signUpError = null

  try {
    const result = await signupClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    authUserId = result?.data?.user?.id || null
    signUpError = result?.error || null
  } catch (error) {
    signUpError = error
  }

  const signUpErrorMessage = signUpError?.message || ''
  const isUserAlreadyExists = signUpError?.code === 'user_already_exists' || /User already registered/.test(signUpErrorMessage)

  if (isUserAlreadyExists) {
    const { data: existingEmployee } = await supabaseClient
      .from('employee')
      .select('employee_id, user_id')
      .eq('email', email)
      .maybeSingle()

    if (existingEmployee) {
      return { ...existingEmployee, employeeCreated: true }
    }

    const roleName = String(position || role || 'employee').trim() || 'employee'
    const derivedDepartment = getDepartmentForRole(roleName, department || 'General')

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

    let authUserIdFromServer = null
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resolve-user-id-by-email',
          email,
        }),
      })

      const result = await response.json().catch(() => null)
      if (response.ok && result?.userId) {
        authUserIdFromServer = result.userId
      }
    } catch {
      // proceed without user_id if lookup fails
    }

    const { data: createdEmployee, error: createError } = await supabaseClient
      .from('employee')
      .insert([
        {
          first_name: firstName || email.split('@')[0] || 'Unknown',
          last_name: lastName || 'User',
          position: roleName,
          department: derivedDepartment,
          employee_type: 'staff',
          role: roleName,
          role_id: roleId,
          user_id: authUserIdFromServer,
          email,
          username: normalizedUsername,
        },
      ])
      .select()
      .single()

    if (createError) {
      console.warn('[registerUser] Failed to create employee for existing auth user:', createError)
      savePendingEmployee({
        email,
        username: normalizedUsername,
        firstName: firstName || email.split('@')[0] || 'Unknown',
        lastName: lastName || 'User',
        position: roleName,
        department: derivedDepartment,
        employeeType: 'staff',
        role: roleName,
        createdAt: Date.now(),
      })
      return { employeeCreated: false, pendingEmployee: true, authAlreadyExists: true }
    }

    clearPendingEmployee()
    return { ...createdEmployee, employeeCreated: true }
  }

  if (signUpError) {
    throw signUpError
  }

  if (!authUserId) {
    const pendingRoleName = String(position || role || 'employee').trim() || 'employee'
    savePendingEmployee({
      email,
      username: normalizedUsername,
      firstName: firstName || email.split('@')[0] || 'Unknown',
      lastName: lastName || 'User',
      position: pendingRoleName,
      department: getDepartmentForRole(pendingRoleName, department || 'General'),
      employeeType: 'staff',
      role: pendingRoleName,
      createdAt: Date.now(),
    })

    return { employeeCreated: false, pendingEmployee: true }
  }

  try {
    const fallbackFirstName = firstName || email.split('@')[0] || 'Unknown'
    const fallbackLastName = lastName || 'User'
    const roleName = String(position || role || 'employee').trim() || 'employee'
    const derivedDepartment = getDepartmentForRole(roleName, department || 'General')

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

    let resolvedUserId = authUserId
    if (!resolvedUserId) {
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'resolve-user-id-by-email',
            email,
          }),
        })

        const result = await response.json().catch(() => null)
        if (response.ok && result?.userId) {
          resolvedUserId = result.userId
        }
      } catch {
        // proceed without user_id if lookup fails
      }
    }

    const { data: existingEmployee } = await supabaseClient
      .from('employee')
      .select('employee_id')
      .eq('user_id', resolvedUserId)
      .maybeSingle()

    if (existingEmployee) {
      clearPendingEmployee()
      return { ...existingEmployee, employeeCreated: true }
    }

    const { data, error: insertError } = await supabaseClient
      .from('employee')
      .insert([
        {
          first_name: fallbackFirstName,
          last_name: fallbackLastName,
          position: roleName,
          department: derivedDepartment,
          employee_type: 'staff',
          role: roleName,
          role_id: roleId,
          user_id: resolvedUserId,
          email,
          username: normalizedUsername,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.warn(
        '[registerUser] Immediate employee insert failed. Will retry after verification.',
        insertError
      );
      
      savePendingEmployee({
        email,
        username: normalizedUsername,
        firstName: fallbackFirstName,
        lastName: fallbackLastName,
        position: roleName,
        department: derivedDepartment,
        employeeType: 'staff',
        role: roleName,
        createdAt: Date.now(),
      })

      return { ...data, employeeCreated: false, pendingEmployee: true }
    }

    clearPendingEmployee()
    return { ...data, employeeCreated: true }
  } catch (e) {
    console.warn('[registerUser] Employee creation threw error:', e)
    const pendingRoleName = String(position || role || 'employee').trim() || 'employee'
    
    savePendingEmployee({
      email,
      username: normalizedUsername,
      firstName: firstName || email.split('@')[0] || 'Unknown',
      lastName: lastName || 'User',
      position: pendingRoleName,
      department: getDepartmentForRole(pendingRoleName, department || 'General'),
      employeeType: 'staff',
      role: pendingRoleName,
      createdAt: Date.now(),
    })

    return { employeeCreated: false, pendingEmployee: true }
  }
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

export const logoutUser = async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;

  return true;
};

export const logoutAllDevices = async () => {
  const { error } = await supabaseClient.auth.signOut({
    scope: 'global',
  });
  if (error) throw error;

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
