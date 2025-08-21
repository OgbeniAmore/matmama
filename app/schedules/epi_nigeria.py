from __future__ import annotations

from datetime import date, timedelta
from typing import List

from ..models import Milestone


# Nigeria EPI schedule (condensed), doses by age after birth
# This mapping is simplified; adapt per NPHCDA guidance as needed.
EPI_SCHEDULE = [
	("At birth", 0, ["BCG", "OPV 0", "HepB 0"]),
	("6 Weeks", 6 * 7, ["Penta 1", "OPV 1", "PCV 1", "Rota 1"]),
	("10 Weeks", 10 * 7, ["Penta 2", "OPV 2", "PCV 2", "Rota 2"]),
	("14 Weeks", 14 * 7, ["Penta 3", "OPV 3", "IPV 1", "PCV 3"]),
	("6 Months", int(26 * 7), ["Vitamin A 1"]),
	("9 Months", int(39 * 7), ["Measles 1", "Yellow Fever 1", "MenA 1"]),
	("12 Months", int(52 * 7), ["Measles 2", "MenA 2", "Yellow Fever 2"]),
]


def generate_epi_milestones(child_dob: date) -> List[Milestone]:
	milestones: List[Milestone] = []
	for label, offset_days, doses in EPI_SCHEDULE:
		due = child_dob + timedelta(days=offset_days)
		for dose in doses:
			name = f"{dose} ({label})"
			milestones.append(Milestone(name=name, due_date=due))
	return milestones
