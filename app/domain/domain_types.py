from dataclasses import dataclass
from typing import Optional


@dataclass
class ChatMessagePayload:
    id: int
    sender_id: int
    receiver_id: int
    message: str
    timestamp: Optional[str]


@dataclass
class PlayerStats:
    kills: int = 0
    nemesis_kills: int = 0
    damage_dealt: int = 0
    damage_taken: int = 0
    pistol_shots: int = 0
    grenades: int = 0
    medkits: int = 0
    reloads: int = 0
    knife_uses: int = 0


@dataclass
class LeaderboardStats:
    kills: int = 0
    damage_dealt: int = 0
    damage_taken: int = 0
    pistol_shots: int = 0
    grenades_used: int = 0
    medkits_used: int = 0
    reloads: int = 0
    knife_uses: int = 0


@dataclass
class LeaderboardEntry:
    user_id: int
    display_name: str
    login_username: str
    score: int
    rank: int = 0
    is_current_user: bool = False


@dataclass
class FriendAction:
    state: str
    label: str
    disabled: bool
    action: Optional[str] = None


@dataclass
class AchievementDefinition:
    id: str
    name: str
    description: str
    target: int
    metric: str
    icon: str
    tier_thresholds: tuple = ()
    badge_family: str = ""
    badge_image: str = ""

    def __post_init__(self):
        if not self.tier_thresholds:
            self.tier_thresholds = (self.target, self.target, self.target)

        if not self.badge_family:
            self.badge_family = self.id
