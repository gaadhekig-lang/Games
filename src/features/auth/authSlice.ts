import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
    user: any | null;
    session: any | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = {
    user: null,
    session: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{ user: any; session: any }>
        ) => {
            state.user = action.payload.user;
            state.session = action.payload.session;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.session = null;
            state.isAuthenticated = false;
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
