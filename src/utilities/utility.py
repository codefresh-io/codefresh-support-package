from utilities.logger_config import setup_logger
import shutil
import tarfile
import yaml
import os

logger = setup_logger(__name__)


class Utility:
    def __init__(self) -> None:
        pass

    def write_yaml(self, py_obj: object, file_name: str):
        try:
            with open(f"{file_name}.yaml", "w") as f:
                yaml.dump(py_obj, f, sort_keys=False)
            print("Written to file successfully")
        except Exception as error:
            logger.error(
                f"{self.__class__.__name__} {error}\n\nError writing YAML file {file_name}"
            )

    def prepare_package(self, output_filename: str, dir_path: str):
        compressed_support_package = f"{output_filename}.tar.gz"
        logger.info(f"{self.__class__.__name__} Preparing the support package")

        if not os.path.isdir(dir_path):
            raise NotADirectoryError(f"{dir_path} is not a valid directory")

        try:
            with tarfile.open(output_filename, "w:gz") as tar:
                tar.add(dir_path, arcname=os.path.basename(dir_path))
        except Exception as error:
            logger.error(
                f"{self.__class__.__name__} {error}\n\nPlease manually compress the directory {dir_path} and attach it to the support ticket."
            )
        else:
            shutil.rmtree(dir_path)

    def process_data(self, dir_path, k8s_resource):
        logger.info(f"{self.__class__.__name__} Processing and saving data")
