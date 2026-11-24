import random
from typing import Dict, List, Optional, Set, Tuple


def _is_excluded(exclusions: Set[Tuple[str, str]], a: str, b: str) -> bool:
    return (a, b) in exclusions or (b, a) in exclusions


def build_exclusion_set(pairs: List[Tuple[str, str]]) -> Set[Tuple[str, str]]:
    s = set()
    for a, b in pairs:
        if a and b and a != b:
            x, y = sorted([a, b])
            s.add((x, y))
    return s


def derangement_draw(member_ids: List[str], exclusions: Optional[Set[Tuple[str, str]]] = None, max_attempts: int = 1500) -> Optional[Dict[str, str]]:
    exclusions = exclusions or set()
    ids = list(member_ids)
    if len(ids) < 2:
        return None
    # For 2 participants only possible if not excluded and not self; derangement means swap
    for _ in range(max_attempts):
        receivers = ids[:]
        random.shuffle(receivers)
        ok = True
        for santa, recv in zip(ids, receivers):
            if santa == recv:
                ok = False
                break
            if _is_excluded(exclusions, santa, recv):
                ok = False
                break
        if ok:
            return {s: r for s, r in zip(ids, receivers)}
    return None


def validate_draw(member_ids: List[str], assignment: Dict[str, str], exclusions: Optional[Set[Tuple[str, str]]] = None) -> bool:
    exclusions = exclusions or set()
    ids = set(member_ids)
    if set(assignment.keys()) != ids:
        return False
    if set(assignment.values()) != ids:
        return False
    for santa, recv in assignment.items():
        if santa == recv:
            return False
        if _is_excluded(exclusions, santa, recv):
            return False
    return True
