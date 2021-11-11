import { useState, useCallback } from 'react';
export type MapOrEntries<K, V> = Map<K, V> | Array<[K, V]>;

export interface UseMapActions<K, V> {
  set: (key: K, value: V) => void;
  has: (key: K) => boolean;
  get: (key: K) => V | undefined;
  remove: (key: K) => void;
  clear: Map<K, V>['clear'];
  initialize: (map: MapOrEntries<K, V>) => void;
}

export type UseMap<K, V> = [Map<K, V>, UseMapActions<K, V>];

export function useMap<K, V>(initialState: MapOrEntries<K, V> = new Map()): UseMap<K, V> {
  const [map, setMap] = useState(Array.isArray(initialState) ? new Map(initialState) : initialState);

  const set = useCallback((key, value) => {
    setMap(_map => {
      const copy = new Map(_map);
      copy.set(key, value);
      return copy;
    });
  }, []);

  const { has, get } = map;

  const remove = useCallback(key => {
    setMap(_map => {
      const copy = new Map(_map);
      copy.delete(key);
      return copy;
    });
  }, []);

  const clear = useCallback(() => {
    setMap(() => new Map());
  }, []);

  const initialize = useCallback((_map: MapOrEntries<K, V> = []) => {
    setMap(() => new Map(_map));
  }, []);

  return [
    map,
    {
      get,
      clear,
      remove,
      set,
      has,
      initialize
    }
  ];
}
