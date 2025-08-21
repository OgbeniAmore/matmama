from __future__ import annotations

from datetime import datetime, date
from typing import Optional


def parse_nigeria_date(text: str) -> Optional[date]:
	# Accept DD-MM-YYYY or DD/MM/YYYY
	for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
		try:
			return datetime.strptime(text.strip(), fmt).date()
		except ValueError:
			continue
	return None
