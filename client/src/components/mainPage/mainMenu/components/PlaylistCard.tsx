import { memo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Playlist } from "../../../../types/Playlist";
import { useFormatTime } from "../../../../hooks/useFormatTime";

interface PlaylistCardProps {
  playlist: Playlist;
}

/**
 * Card component for playlist display
 * Shows different layouts for mobile/tablet/desktop
 */
const PlaylistCard = ({ playlist }: PlaylistCardProps) => {
  const [hover, setHover] = useState(false);
  const navigate = useNavigate();

  const formatTimeString = useCallback((timeStr: string) => {
    const parts = timeStr.split(":");
    const result = [];

    if (parts.length === 2) {
      const [minutes] = parts;
      if (minutes !== "0") {
        result.push(`${minutes} min${minutes !== "1" ? "s" : ""}`);
      }
    } else if (parts.length === 3) {
      const [hours, minutes] = parts;
      if (hours !== "0") {
        result.push(`${hours} hour${hours !== "1" ? "s" : ""}`);
      }
      if (minutes !== "00") {
        result.push(`${minutes} min${minutes !== "1" ? "s" : ""}`);
      }
    }

    return result.join(" ") || "0 mins";
  }, []);

  const handleNavigate = useCallback(() => {
    navigate(`/playlist/${playlist._id}`);
  }, [ navigate, playlist._id]);

  const MobileCard = () => (
    <div
      className="w-full h-48 rounded-2xl relative overflow-hidden cursor-pointer group"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleNavigate}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{
          backgroundImage: `url(${playlist.coverUrl})`,
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <div className="flex items-end justify-between">
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold tracking-wider mb-1 line-clamp-2">
              {playlist.name}
            </h1>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <span>{playlist.trackCount} songs</span>
              <span>•</span>
              <span>
                {formatTimeString(useFormatTime(playlist.totalDuration))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const TabletCard = () => (
    <div
      className="w-full h-56 rounded-3xl relative overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        backgroundImage: `url(${playlist.coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleNavigate}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 backdrop-blur-[1px]" />

      <div className="absolute inset-0 flex items-end justify-between p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-white text-2xl xl:text-3xl font-bold tracking-wider">
            {playlist.name}
          </h1>
          <div className="flex items-center text-gray-300 text-lg">
            <span>{playlist.trackCount} songs</span>
            <span className="mx-2">·</span>
            <span>
              {formatTimeString(useFormatTime(playlist.totalDuration))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const DesktopCard = () => (
    <div
      className={
        "w-full h-[35vh] rounded-3xl glass flex pl-10 pr-10 pb-4 items-end duration-300 transition-all cursor-pointer justify-between " +
        (hover ? "drop-shadow-[0_7px_7px_rgba(0,0,0,0.4)]" : "")
      }
      style={{
        backgroundImage: `url(${playlist.coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleNavigate}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-white text-4xl font-bold tracking-wider">
          {playlist.name}
        </h1>
        <div className="flex">
          <h1 className="text-gray-400 text-xl tracking-wide">
            {playlist.trackCount} songs ·{" "}
            {formatTimeString(useFormatTime(playlist.totalDuration))}
          </h1>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="block md:hidden">
        <MobileCard />
      </div>

      <div className="hidden md:block xl:hidden">
        <TabletCard />
      </div>

      <div className="hidden xl:block">
        <DesktopCard />
      </div>
    </>
  );
};

export default memo(PlaylistCard);
