import { Combobox, Input, InputBase, useCombobox } from '@mantine/core';
import type { LocalMovie, OmdbMovie } from '../types';
import { useState } from 'react';
import { useMovies } from '../hooks/useMovies';

export function MovieSearchBox() {
  const [search, setSearch] = useState('');
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      combobox.focusTarget();
      setSearch('');
    },

    onDropdownOpen: () => {
      combobox.focusSearchInput();
    },
  });

  const [value, setValue] = useState<string | null>(null);

  return (<div></div>);
}
