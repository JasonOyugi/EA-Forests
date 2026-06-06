import ee

from app.earth_engine import configure_earth_engine_network, earth_engine_project


def main() -> None:
    configure_earth_engine_network()
    project = earth_engine_project()
    ee.Authenticate()
    if project:
        ee.Initialize(project=project)
    else:
        ee.Initialize()
    print("Earth Engine authentication completed successfully.")


if __name__ == "__main__":
    main()
