"""Reference genetics catalog: genera, species and hybrid varieties.

This is the single source of truth for tree genetics/variety information
consumed by the frontend (seedling shop, dashboard, maps, markets, etc.).
Hardcoded species/variety strings in frontend data files should progressively
be normalised against this catalog rather than duplicated ad-hoc.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any


def _slugify(*parts: str) -> str:
    return "-".join(part.strip().lower().replace(" ", "-") for part in parts if part)


def _species_variety(
    genus: str, species: str, common_name: str | None = None
) -> dict[str, Any]:
    return {
        "id": _slugify(genus, species),
        "genus": genus,
        "species": species,
        "is_hybrid": False,
        "parent_species": None,
        "scientific_name": f"{genus} {species}",
        "common_name": common_name,
    }


def _hybrid_variety(
    genus: str, parent_a: str, parent_b: str, common_name: str | None = None
) -> dict[str, Any]:
    return {
        "id": _slugify(genus, parent_a, "x", parent_b),
        "genus": genus,
        "species": None,
        "is_hybrid": True,
        "parent_species": [parent_a, parent_b],
        "scientific_name": f"{genus} {parent_a} \u00d7 {parent_b}",
        "common_name": common_name,
    }


def _genus(
    name: str,
    scientific_name: str,
    common_name: str | None,
    varieties: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "name": name,
        "scientific_name": scientific_name,
        "common_name": common_name,
        "varieties": varieties,
    }


@lru_cache(maxsize=1)
def _build_catalog() -> dict[str, Any]:
    genera = [
        _genus(
            "Eucalyptus",
            "Eucalyptus",
            "Gum",
            [
                _species_variety("Eucalyptus", "grandis"),
                _species_variety("Eucalyptus", "urophylla"),
                _species_variety("Eucalyptus", "saligna"),
                _species_variety("Eucalyptus", "cloeziana"),
                _species_variety("Eucalyptus", "camaldulensis"),
                _species_variety("Eucalyptus", "nitens"),
                _hybrid_variety("Eucalyptus", "grandis", "urophylla"),
                _hybrid_variety("Eucalyptus", "grandis", "camaldulensis"),
                _hybrid_variety("Eucalyptus", "grandis", "saligna"),
                _hybrid_variety("Eucalyptus", "saligna", "urophylla"),
                _hybrid_variety("Eucalyptus", "grandis", "nitens"),
            ],
        ),
        _genus(
            "Pine",
            "Pinus",
            "Pine",
            [
                _species_variety("Pinus", "tecunumanii"),
                _species_variety("Pinus", "patula"),
                _species_variety("Pinus", "elliottii"),
                _species_variety("Pinus", "caribaea"),
                _species_variety("Pinus", "maximinoi"),
                _hybrid_variety("Pinus", "patula", "tecunumanii"),
                _hybrid_variety("Pinus", "patula", "caribaea"),
            ],
        ),
        _genus(
            "Acacia",
            "Acacia",
            "Acacia",
            [
                _species_variety("Acacia", "senegal"),
                _species_variety("Acacia", "nilotica"),
                _species_variety("Acacia", "melanoxylon"),
                _species_variety("Acacia", "seyal"),
            ],
        ),
        _genus(
            "Melia",
            "Melia",
            None,
            [
                _species_variety("Melia", "volkensii"),
                _species_variety("Melia", "azedarach"),
            ],
        ),
        _genus(
            "Gmelina",
            "Gmelina",
            "Melina",
            [_species_variety("Gmelina", "arborea")],
        ),
        _genus(
            "Maesopsis",
            "Maesopsis",
            "Musizi",
            [_species_variety("Maesopsis", "eminii")],
        ),
        _genus(
            "Markhamia",
            "Markhamia",
            None,
            [],
        ),
        _genus(
            "Grevillea",
            "Grevillea",
            "Silver oak",
            [_species_variety("Grevillea", "robusta")],
        ),
        _genus(
            "Tectona",
            "Tectona",
            "Teak",
            [_species_variety("Tectona", "grandis")],
        ),
    ]

    total_varieties = sum(len(genus["varieties"]) for genus in genera)

    return {"genera": genera, "total_varieties": total_varieties}


def get_genetics_catalog() -> dict[str, Any]:
    return _build_catalog()


def list_genetics_varieties() -> list[dict[str, Any]]:
    catalog = _build_catalog()
    return [variety for genus in catalog["genera"] for variety in genus["varieties"]]
