"""Recursively converts dict keys from snake_case (idiomatic Python) to camelCase, so whitelisted
endpoints can stay Pythonic internally while matching the camelCase payload shape the React
frontend's TypeScript types already expect (ported as-is from Sugar360_UI)."""


def to_camel_case(value):
	if isinstance(value, dict):
		return {_snake_to_camel(key): to_camel_case(v) for key, v in value.items()}
	if isinstance(value, list):
		return [to_camel_case(v) for v in value]
	return value


def _snake_to_camel(key: str) -> str:
	parts = key.split("_")
	return parts[0] + "".join(part.title() for part in parts[1:])
