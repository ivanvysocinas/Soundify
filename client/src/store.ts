import { configureStore } from "@reduxjs/toolkit";
import queueReducer from "./state/Queue.slice";
import dashboardMenuSliceReducer from "./state/DashboardMenu.slice";
import tokenReducer from "./state/Token.slice";
import { userApiSlice } from "./state/UserApi.slice";
import isGenreSelectOpenSliceReducer from "./state/isGenreSelectOpen.slice";
import likeUpdateSliceReducer from "./state/LikeUpdate.slice";
import CurrentTrackSliceReducer from "./state/CurrentTrack.slice";

export const store = configureStore({
  reducer: {
    queue: queueReducer,
    dashboardMenu: dashboardMenuSliceReducer,
    token: tokenReducer,
    userApi: userApiSlice.reducer,
    isGenreSelectOpen: isGenreSelectOpenSliceReducer,
    likeUpdate: likeUpdateSliceReducer,
    currentTrack: CurrentTrackSliceReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(userApiSlice.middleware),
});

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
