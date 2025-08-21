from datetime import date
from ..models import ServiceType


SERVICE_LABEL = {
	ServiceType.immunization: {
		"en": "Immunization",
		"sw": "Chanjo",
	},
	ServiceType.anc: {
		"en": "Antenatal care",
		"sw": "Huduma za wajawazito",
	},
	ServiceType.family_planning: {
		"en": "Family planning",
		"sw": "Uzazi wa mpango",
	},
	ServiceType.tb_care: {
		"en": "Tuberculosis care",
		"sw": "Huduma za kifua kikuu",
	},
}


def reminder_text(full_name: str, service: ServiceType, scheduled: date, lang: str = "en") -> str:
	label = SERVICE_LABEL.get(service, {}).get(lang, SERVICE_LABEL[service]["en"]) if service in SERVICE_LABEL else service.value
	if lang == "sw":
		return (
			f"Habari {full_name}. Umechelewa kwenye miadi ya {label} iliyopangwa {scheduled:%d %b %Y}. "
			"Tafadhali tembelea kituo chako haraka iwezekanavyo. Jibu 'DONE' ukishahudumiwa, au 'HELP' kupata msaada."
		)
	return (
		f"Hello {full_name}. You are overdue for your {label} appointment scheduled on {scheduled:%d %b %Y}. "
		"Please visit your clinic as soon as possible. Reply 'DONE' after attending, or 'HELP' for assistance."
	)


def help_text(lang: str = "en") -> str:
	if lang == "sw":
		return "Chaguo: Jibu 'DONE' ukishahudumiwa. Jibu 'STOP' kusitisha ujumbe."
	return "Options: Reply 'DONE' after attending. Reply 'STOP' to opt out."


def confirm_done_text(lang: str = "en") -> str:
	return "Thank you. We've recorded your attendance. If this is a mistake, reply 'HELP'." if lang != "sw" else "Asante. Tumerekodi kuwa umehudumiwa. Ukiwa na swali, jibu 'HELP'."


def optout_text(lang: str = "en") -> str:
	return "You will no longer receive reminders. Reply 'START' to resume." if lang != "sw" else "Hutapokea tena vikumbusho. Jibu 'START' kuendelea kupokea."


def start_text(lang: str = "en") -> str:
	return "You will receive reminders again." if lang != "sw" else "Utapokea tena vikumbusho."
