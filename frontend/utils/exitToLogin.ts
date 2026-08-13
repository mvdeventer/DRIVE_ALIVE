/**
 * Leaving a deep-linked screen for the login screen.
 *
 * `VerifyAccount`, `InstructorVerify`, `InstructorCompanyVerify`,
 * `InstructorInvite` and `ResetPassword` are mounted for signed-in and
 * signed-out visitors alike, but `Login` only exists in the **signed-out** half
 * of the root navigator in `App.tsx`. Dispatching to it while a session is live
 * therefore does nothing at all — React Navigation logs
 * "The action 'REPLACE' with payload {"name":"Login"} was not handled by any
 * navigator" and the button looks broken.
 *
 * Ending the session is what actually puts the login screen on screen: the
 * navigator swaps groups, and on web `onLogout` reloads to `/`, which resolves
 * to `Login`.
 */
import { useCallback, useRef } from 'react';
import { useAuthActions } from '../navigation/AuthContext';

/**
 * Whether a session is loaded. `userRole` is null and `userName` empty whenever
 * nobody is signed in, and one of them is set for every signed-in state —
 * including the moment between logging in and picking a runtime role.
 */
export function useSignedIn(): boolean {
  const { userRole, userName } = useAuthActions();
  return Boolean(userRole) || Boolean(userName);
}

export function useExitToLogin(navigation: any): () => void {
  const { onLogout } = useAuthActions();
  const signedIn = useSignedIn();

  return useCallback(() => {
    if (signedIn) {
      onLogout();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [navigation, onLogout, signedIn]);
}

/**
 * Keeps a stable handle on the latest exit function so a countdown effect can
 * fire it without listing it as a dependency — `onLogout` is rebuilt on every
 * render of `App`, and depending on it directly restarts the countdown.
 */
export function useExitToLoginRef(navigation: any): { current: () => void } {
  const exit = useExitToLogin(navigation);
  const ref = useRef(exit);
  ref.current = exit;
  return ref;
}
