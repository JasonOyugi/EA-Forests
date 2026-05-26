import os

import ee


def main() -> None:
    project = os.getenv("EARTH_ENGINE_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
    ee.Authenticate()
    if project:
        ee.Initialize(project=project)
    else:
        ee.Initialize()
    print("Earth Engine authentication completed successfully.")


if __name__ == "__main__":
    main()
