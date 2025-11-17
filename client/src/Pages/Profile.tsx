import { useLocation } from "react-router-dom";
import { useUserData } from "../hooks/useUserData";
import Header from "../components/Profile/Header";
import Anonym from "../images/User/Anonym.jpg";
import MainMenu from "../components/Profile/MainMenu";
import { useGetUserQuery } from "../state/UserApi.slice";
import AuthenticationWarning from "../shared/components/AuthWarning";


/**
 * Profile Page Component with responsive design and authentication
 * Features access control, loading states, and error handling
 */

/**
 * Error Display Component
 */
const ErrorDisplay = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div className="min-h-screen w-full flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-red-50/10 border border-red-200/20 rounded-2xl p-6 text-center">
      <svg
        className="h-12 w-12 text-red-400 mx-auto mb-4"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <h2 className="text-xl font-semibold text-white mb-2">
        Error Loading Profile
      </h2>
      <p className="text-red-300 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="bg-red-100/20 hover:bg-red-100/30 text-red-300 px-4 py-2 rounded-xl transition-colors duration-200"
      >
        Try Again
      </button>
    </div>
  </div>
);

export default function Profile() {
  const location = useLocation();
  const userId = location.pathname.split("/")[2];
  const { data, isLoading, error, refetch } = useUserData(userId);
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useGetUserQuery();

  const isAuthenticated = !!currentUser && !isCurrentUserLoading;
  const shouldShowAuthWarning = !isAuthenticated && !isCurrentUserLoading;

  const hasAccess =
    isAuthenticated &&
    (data?._id === currentUser?._id || currentUser?.status === "ADMIN");

  if (shouldShowAuthWarning) {
    return <AuthenticationWarning />;
  }

  if (error && !isLoading) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col mb-35 xl:mb-0">
      <div className="flex-1 pl-4 pr-4 md:pl-6 md:pr-6 xl:pl-[22vw] xl:pr-[2vw] pb-5 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5">
          <div className="w-full">
            <Header
              imageSrc={data?.avatar || Anonym}
              username={data?.username || ""}
              isLoading={isLoading}
              playlists={data?.playlists || []}
              likedArtists={
                data?.likedArtists || []
              }
            />
          </div>

          <div className="flex-1 min-h-0 w-full">
            <MainMenu
              userId={userId}
              isLoading={isLoading}
              access={hasAccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
