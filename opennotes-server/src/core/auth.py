from enum import Enum


class TrustLevel(str, Enum):
    NEWCOMER = "newcomer"
    CONTRIBUTOR = "contributor"
    TRUSTED = "trusted"
    MODERATOR = "moderator"
    ADMIN = "admin"


class Scope(str, Enum):
    NOTES_READ = "notes:read"
    NOTES_WRITE = "notes:write"
    NOTES_DELETE_OWN = "notes:delete_own"
    NOTES_DELETE_ANY = "notes:delete_any"

    REQUESTS_WRITE = "requests:write"

    RATINGS_WRITE = "ratings:write"

    USERS_READ = "users:read"
    USERS_WRITE_SELF = "users:write_self"
    USERS_WRITE_ANY = "users:write_any"

    MODERATION_READ = "moderation:read"
    MODERATION_WRITE = "moderation:write"

    ANALYTICS_READ = "analytics:read"

    SERVER_CONFIG = "server:config"


ROLE_SCOPES: dict[TrustLevel, list[Scope]] = {
    TrustLevel.NEWCOMER: [
        Scope.NOTES_READ,
        Scope.REQUESTS_WRITE,
        Scope.USERS_READ,
        Scope.USERS_WRITE_SELF,
    ],
    TrustLevel.CONTRIBUTOR: [
        Scope.NOTES_READ,
        Scope.NOTES_WRITE,
        Scope.NOTES_DELETE_OWN,
        Scope.REQUESTS_WRITE,
        Scope.RATINGS_WRITE,
        Scope.USERS_READ,
        Scope.USERS_WRITE_SELF,
    ],
    TrustLevel.TRUSTED: [
        Scope.NOTES_READ,
        Scope.NOTES_WRITE,
        Scope.NOTES_DELETE_OWN,
        Scope.REQUESTS_WRITE,
        Scope.RATINGS_WRITE,
        Scope.USERS_READ,
        Scope.USERS_WRITE_SELF,
        Scope.ANALYTICS_READ,
    ],
    TrustLevel.MODERATOR: [
        Scope.NOTES_READ,
        Scope.NOTES_WRITE,
        Scope.NOTES_DELETE_OWN,
        Scope.NOTES_DELETE_ANY,
        Scope.REQUESTS_WRITE,
        Scope.RATINGS_WRITE,
        Scope.USERS_READ,
        Scope.USERS_WRITE_SELF,
        Scope.MODERATION_READ,
        Scope.MODERATION_WRITE,
        Scope.ANALYTICS_READ,
    ],
    TrustLevel.ADMIN: [scope for scope in Scope],
}


def get_scopes_for_role(trust_level: TrustLevel) -> list[str]:
    return [scope.value for scope in ROLE_SCOPES.get(trust_level, [])]
