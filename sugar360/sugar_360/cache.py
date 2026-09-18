"""Thin wrapper over Frappe's Redis cache, standing in for the Node BFF's in-process TTL cache
(see Sugar360_UI/src/lib/frappe/cache.ts). frappe.cache() already pickles arbitrary Python
values, so this just gives call sites the same get-or-compute shape."""

import frappe


def get_or_set_cache(key: str, ttl_seconds: int, load):
	cached = frappe.cache().get_value(key)
	if cached is not None:
		return cached

	value = load()
	frappe.cache().set_value(key, value, expires_in_sec=ttl_seconds)
	return value


def invalidate_cache(key: str) -> None:
	frappe.cache().delete_value(key)
