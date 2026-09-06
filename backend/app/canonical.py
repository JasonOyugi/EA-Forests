"""python -m app.canonical {bootstrap,import,demo}; migrations remain explicit."""

import argparse
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.session import database_url, engine_for
from app.services.ingestion.market_databases import DATA_ROOT, DATASETS, MarketImporter
from app.services.state.demo import demonstrate
from app.services.state.registry import bootstrap
from app.services.state.snapshots import json_default


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("bootstrap")
    importer = sub.add_parser("import")
    importer.add_argument("dataset", choices=[*DATASETS, "all"])
    importer.add_argument("--only", help="Exact source record key")
    demo = sub.add_parser("demo")
    demo.add_argument("--output", type=Path, help="Write private lineage report to this file")
    args = parser.parse_args()
    with Session(engine_for(database_url())) as session, session.begin():
        if args.command == "bootstrap":
            result = bootstrap(session)
        elif args.command == "import":
            adapter = MarketImporter(session)
            result = []
            for dataset in DATASETS if args.dataset == "all" else [args.dataset]:
                report = adapter.import_file(DATA_ROOT / f"{dataset}.json", only=args.only)
                result.append(
                    {
                        **report,
                        "record_count": len(report["records"]),
                        "records": report["records"] if args.only else [],
                    }
                )
                print(
                    f"Imported {dataset}: {len(report['records'])} records; already imported: {report['already_imported']}",
                    flush=True,
                )
        else:
            result = demonstrate(session)
    encoded = json.dumps(result, default=json_default, indent=2)
    if args.command == "demo" and args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf8")
        print(
            json.dumps(
                {k: v for k, v in result.items() if k != "explanation"},
                default=json_default,
                indent=2,
            )
        )
    else:
        print(encoded)


if __name__ == "__main__":
    main()
