import api from './api';

// Login with email/password
export const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data; // { message, token, user: { id, fullName, email } }
};

// Register new account
export const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { 
        fullName: name, 
        email, 
        password 
    });
    return response.data;
};

// Get current user profile
export const getProfile = async () => {
    const response = await api.get('/users/profile');
    return response.data?.data;
};
