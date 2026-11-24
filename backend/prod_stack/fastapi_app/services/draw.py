import random
from typing import Dict, List, Optional, Set, Tuple


def build_exclusion_set(pairs: List[Tuple[str, str]]) -> Set[Tuple[str, str]]:
    s = set()
    for a, b in pairs:
        if a and b and a != b:
            x, y = sorted([a, b])
            s.add((x, y))
    return s


def _excluded(ex: Set[Tuple[str, str]], a: str, b: str) -> bool:
    return (a, b) in ex or (b, a) in ex


def derangement_draw(member_ids: List[str], exclusions: Optional[Set[Tuple[str, str]]] = None, max_attempts: int = 1500):
    exclusions = exclusions or set()
    ids = list(member_ids)
    if len(ids) < 2:
        return None
    for _ in range(max_attempts):
        receivers = ids[:]
        random.shuffle(receivers)
        ok = True
        for s, r in zip(ids, receivers):
            if s == r or _excluded(exclusions, s, r):
                ok = False
                break
        if ok:
            return {s: r for s, r in zip(ids, receivers)}
    return None


def validate_draw(member_ids: List[str], assignment: Dict[str, str], exclusions: Optional[Set[Tuple[str, str]]] = None) -> bool:
    exclusions = exclusions or set()
    ids = set(member_ids)
    if set(assignment.keys()) != ids or set(assignment.values()) != ids:
        return False
    for s, r in assignment.items():
        if s == r or _excluded(exclusions, s, r):
            return False
    return True
