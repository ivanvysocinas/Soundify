import { useState } from "react";
import Header from "../components/BecomeAnArtist/Header";
import MainMenu from "../components/BecomeAnArtist/MainMenu";
import Anonym from "../images/User/Anonym.jpg";
import { api } from "../shared/api";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import { useGetUserQuery } from "../state/UserApi.slice";
import { useArtistProfileCheck } from "../hooks/useArtistProfileCheck";
import Home from "../components/BecomeAnArtist/Home";
import AuthenticationWarning from "../shared/components/AuthWarning";

/**
 * Become an Artist Page
 * Features: responsive design, authentication check, artist profile creation
 */

export type ArtistCreate = {
  name: string;
  bio: string;
  imageSrc: string;
  imageFile?: File;
  genres: string[];
  socialLinks: {
    spotify?: string;
    instagram?: string;
    twitter?: string;
  };
};

const DEFAULT_ARTIST: ArtistCreate = {
  name: "",
  bio: "",
  imageSrc: Anonym,
  genres: [],
  socialLinks: {},
};

export default function BecomeAnArtist() {
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useGetUserQuery();
  const { refetch } = useGetUserQuery();
  const [artist, setArtist] = useState<ArtistCreate>(DEFAULT_ARTIST);
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { hasArtistProfile } = useArtistProfileCheck();

  if (hasArtistProfile) return <Home />;

  const isAuthenticated = !!currentUser && !isCurrentUserLoading;

  if (!isAuthenticated && !isCurrentUserLoading) {
    return <AuthenticationWarning />;
  }

  if (isCurrentUserLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const handleSaveArtist = async (artistData: ArtistCreate) => {
    try {
      const response = await api.artist.becomeAnArtist(artistData);
      const data = await response.json();

      if (!data.success) {
        showError("Failed to create artist profile. Please try again.");
      } else {
        refetch();
        navigate("/");
        showSuccess("Artist profile created successfully!");
      }
    } catch (error) {
      console.error("Failed to save artist:", error);
      showError("Failed to create artist profile. Please try again.");
      throw error;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col mb-30">
      <div className="flex-1 pl-4 pr-4 md:pl-6 md:pr-6 xl:pl-[22vw] xl:pr-[2vw] py-4 sm:py-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
          <div className="w-full">
            <Header
              imageSrc={artist.imageSrc || Anonym}
              localChanges={artist}
              setLocalChanges={(changes) =>
                setArtist((prev) => ({ ...prev, ...changes }))
              }
            />
          </div>

          <div className="flex-1 w-full">
            <MainMenu
              localChanges={artist}
              setLocalChanges={(changes) =>
                setArtist((prev) => ({ ...prev, ...changes }))
              }
              onSave={handleSaveArtist}
            />
          </div>
        </div>
      </div>
    </div>
  );
}