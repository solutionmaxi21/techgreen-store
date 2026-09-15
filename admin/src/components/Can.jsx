import { useAuthorization } from '../contexts/AuthorizationContext';

const Can = ({
  permission,
  anyPermissions,
  superAdminOnly = false,
  fallback = null,
  children,
}) => {
  const authorization = useAuthorization();
  const allowed = superAdminOnly
    ? authorization.isSuperAdmin
    : anyPermissions
      ? authorization.canAny(anyPermissions)
      : authorization.can(permission);

  return allowed ? children : fallback;
};

export default Can;

