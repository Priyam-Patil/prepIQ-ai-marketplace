import * as React from 'react';

export function useControlledState(props) {
  const { value, defaultValue, onChange } = props;

  const [internalState, setInternalState] = React.useState(defaultValue);
  const state = value !== undefined ? value : internalState;

  const setState = React.useCallback(
    (next, ...args) => {
      if (value === undefined) setInternalState(next);
      onChange?.(next, ...args);
    },
    [onChange, value],
  );

  return [state, setState];
}
