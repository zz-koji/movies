import { useState } from "react";
import { addMovieRequest, type ExtendedMovieRequest } from "../api/requests";
import type { MovieRequest } from "../types";
import { useDisclosure } from "@mantine/hooks";

export function useMovieRequests() {
  const [movieRequests, setMovieRequests] = useState<ExtendedMovieRequest[]>([]);

  const handleMovieRequest = async (movieRequest: MovieRequest) => {
    const newMovieRequest = await addMovieRequest(movieRequest);
    setMovieRequests((prev) => [newMovieRequest, ...prev]);
  };

  const [movieRequestModalOpened, { open: openMovieRequestModal, close: closeMovieRequestModal }] =
    useDisclosure(false);


  return { handleMovieRequest, movieRequests, modal: { movieRequestModalOpened, openMovieRequestModal, closeMovieRequestModal } }
}



