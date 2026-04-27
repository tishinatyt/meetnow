"""
MeetNow Matching Algorithm
Scores pairs of users and forms groups for meetups.
"""

from itertools import combinations
from typing import TypedDict


class UserProfile(TypedDict):
    id: str
    gender: str                   # male | female | other
    age_group: str                # 18-29 | 30-39 | 40-49 | 50+
    meeting_types: list[str]      # coffee | bar | dinner | cinema | active | walk | workshop | culture
    goals: list[str]              # friends | worldview | new_things | conversations
    personality_type: str         # introvert | ambivert | extrovert
    decision_style: str           # logic | emotions | mood
    values_in_others: list[str]
    own_qualities: list[str]
    industry: str
    life_genre: str               # comedy | drama | adventure | romance
    activities: list[str]         # music | museums | nature | food
    group_vibe: str               # small_safe | smart_inspiring | playful | flexible
    after_feeling: list[str]      # energized | noticed | calm | surprised
    has_children: str             # yes | no | prefer_not
    relationship_status: str


# ── Scoring weights (must sum to 1.0) ──────────────────────────────────────
WEIGHTS = {
    "goals":          0.20,
    "ideal_evening":  0.15,   # activities overlap
    "activities":     0.15,
    "meeting_types":  0.15,
    "after_feeling":  0.15,
    "group_vibe":     0.10,
    "age_group":      0.05,
    "life_genre":     0.05,
}


def jaccard(a: list, b: list) -> float:
    """Jaccard similarity for two lists (intersection / union)."""
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 1.0
    union = sa | sb
    return len(sa & sb) / len(union)


def exact_match(a, b) -> float:
    return 1.0 if a == b else 0.0


def age_proximity(a: str, b: str) -> float:
    """Adjacent age groups score 0.5, same group scores 1.0."""
    order = ["18-29", "30-39", "40-49", "50+"]
    if a not in order or b not in order:
        return 0.5
    diff = abs(order.index(a) - order.index(b))
    return 1.0 if diff == 0 else (0.5 if diff == 1 else 0.0)


def calculate_pair_score(u1: UserProfile, u2: UserProfile) -> float:
    """Return a compatibility score [0, 1] for two users."""
    scores = {
        "goals":         jaccard(u1["goals"], u2["goals"]),
        "ideal_evening": jaccard(u1.get("activities", []), u2.get("activities", [])),
        "activities":    jaccard(u1.get("activities", []), u2.get("activities", [])),
        "meeting_types": jaccard(u1.get("meeting_types", []), u2.get("meeting_types", [])),
        "after_feeling": jaccard(u1.get("after_feeling", []), u2.get("after_feeling", [])),
        "group_vibe":    exact_match(u1.get("group_vibe"), u2.get("group_vibe")),
        "age_group":     age_proximity(u1.get("age_group", ""), u2.get("age_group", "")),
        "life_genre":    exact_match(u1.get("life_genre"), u2.get("life_genre")),
    }
    return sum(WEIGHTS[k] * scores[k] for k in WEIGHTS)


def calculate_group_score(users: list[UserProfile]) -> float:
    """Average pairwise score for a group of users."""
    if len(users) < 2:
        return 0.0
    pairs = list(combinations(users, 2))
    return sum(calculate_pair_score(a, b) for a, b in pairs) / len(pairs)


def form_groups(
    users: list[UserProfile],
    group_size: int = 4,
    gender_mix: str = "any",   # any | mixed | same
) -> list[list[UserProfile]]:
    """
    Greedily form groups of `group_size` from a pool of users.

    gender_mix:
        "any"    — no gender constraint
        "mixed"  — groups must contain at least one person of each gender
        "same"   — groups must be same-gender only
    """
    pool = list(users)
    groups: list[list[UserProfile]] = []

    while len(pool) >= group_size:
        seed = pool.pop(0)
        candidates = [u for u in pool if _gender_ok(seed, u, gender_mix)]

        # Score every candidate against the seed
        ranked = sorted(candidates, key=lambda u: calculate_pair_score(seed, u), reverse=True)

        group = [seed]
        for candidate in ranked:
            if len(group) >= group_size:
                break
            if _group_gender_ok(group, candidate, gender_mix):
                group.append(candidate)

        if len(group) == group_size:
            for u in group[1:]:
                pool.remove(u)
            groups.append(group)
        else:
            # Could not fill a full group — put seed back as remainder
            pool.append(seed)
            break  # avoid infinite loop

    return groups


# ── Gender helpers ──────────────────────────────────────────────────────────

def _gender_ok(seed: UserProfile, candidate: UserProfile, mode: str) -> bool:
    if mode == "any":
        return True
    if mode == "same":
        return seed.get("gender") == candidate.get("gender")
    # mixed: no hard exclusion at pair level, handled at group level
    return True


def _group_gender_ok(group: list[UserProfile], candidate: UserProfile, mode: str) -> bool:
    if mode == "any":
        return True
    if mode == "same":
        genders = {u.get("gender") for u in group}
        genders.add(candidate.get("gender"))
        return len(genders) == 1
    # mixed: once group has >= group_size/2 of one gender, require another
    return True


# ── CLI demo ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    sample_users: list[UserProfile] = [
        {
            "id": "u1", "gender": "female", "age_group": "30-39",
            "meeting_types": ["coffee", "walk"], "goals": ["friends", "conversations"],
            "personality_type": "introvert", "decision_style": "emotions",
            "values_in_others": ["empathy", "honesty"], "own_qualities": ["kind", "calm"],
            "industry": "healthcare", "life_genre": "drama",
            "activities": ["museums", "food"], "group_vibe": "small_safe",
            "after_feeling": ["calm", "noticed"], "has_children": "no",
            "relationship_status": "single",
        },
        {
            "id": "u2", "gender": "male", "age_group": "30-39",
            "meeting_types": ["coffee", "dinner"], "goals": ["conversations", "worldview"],
            "personality_type": "ambivert", "decision_style": "logic",
            "values_in_others": ["intellect", "honesty"], "own_qualities": ["smart", "honest"],
            "industry": "tech", "life_genre": "adventure",
            "activities": ["museums", "music"], "group_vibe": "smart_inspiring",
            "after_feeling": ["energized", "noticed"], "has_children": "no",
            "relationship_status": "single",
        },
        {
            "id": "u3", "gender": "female", "age_group": "18-29",
            "meeting_types": ["bar", "cinema"], "goals": ["new_things", "friends"],
            "personality_type": "extrovert", "decision_style": "mood",
            "values_in_others": ["humor", "creativity"], "own_qualities": ["funny", "creative"],
            "industry": "other", "life_genre": "comedy",
            "activities": ["music", "food"], "group_vibe": "playful",
            "after_feeling": ["energized", "surprised"], "has_children": "no",
            "relationship_status": "in_relationship",
        },
        {
            "id": "u4", "gender": "male", "age_group": "18-29",
            "meeting_types": ["active", "cinema"], "goals": ["new_things", "worldview"],
            "personality_type": "extrovert", "decision_style": "mood",
            "values_in_others": ["adventure", "humor"], "own_qualities": ["adventurous", "funny"],
            "industry": "other", "life_genre": "comedy",
            "activities": ["nature", "music"], "group_vibe": "playful",
            "after_feeling": ["energized", "surprised"], "has_children": "no",
            "relationship_status": "single",
        },
    ]

    print("Pairwise scores:")
    for a, b in combinations(sample_users, 2):
        score = calculate_pair_score(a, b)
        print(f"  {a['id']} ↔ {b['id']}: {score:.3f}")

    print(f"\nGroup score (all 4): {calculate_group_score(sample_users):.3f}")

    groups = form_groups(sample_users, group_size=2, gender_mix="any")
    print(f"\nFormed {len(groups)} group(s):")
    for i, g in enumerate(groups, 1):
        ids = [u["id"] for u in g]
        print(f"  Group {i}: {ids}  score={calculate_group_score(g):.3f}")
