import importlib.util
import unittest
from pathlib import Path

import numpy as np


MODULE_PATH = Path(__file__).with_name("generate-embedding-analysis.py")
SPEC = importlib.util.spec_from_file_location("embedding_analysis", MODULE_PATH)
ANALYSIS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ANALYSIS)


class EmbeddingAnalysisTests(unittest.TestCase):
    def test_normalize_embedding_rejects_incomplete_vectors(self):
        self.assertEqual(ANALYSIS.normalize_embedding([1, "2", 3.5]), [1.0, 2.0, 3.5])
        self.assertEqual(ANALYSIS.normalize_embedding([1, "invalid"]), [])
        self.assertEqual(ANALYSIS.normalize_embedding(None), [])

    def test_prepare_embedding_matrix_uses_dominant_dimension(self):
        items = [
            {"embedding": [1, 0, 0]},
            {"embedding": [0, 1, 0]},
            {"embedding": [1, 0]},
        ]

        accepted, rejected, matrix, dimension = ANALYSIS.prepare_embedding_matrix(items)

        self.assertEqual(dimension, 3)
        self.assertEqual(len(accepted), 2)
        self.assertEqual(len(rejected), 1)
        self.assertEqual(matrix.shape, (2, 3))

    def test_prepare_embedding_matrix_rejects_zero_vectors(self):
        items = [
            {"embedding": [1, 0, 0]},
            {"embedding": [0, 1, 0]},
            {"embedding": [0, 0, 0]},
        ]

        accepted, rejected, _, dimension = ANALYSIS.prepare_embedding_matrix(items)

        self.assertEqual(dimension, 3)
        self.assertEqual(len(accepted), 2)
        self.assertEqual(len(rejected), 1)

    def test_deterministic_sample_is_reproducible(self):
        items = [{"id": index} for index in range(100)]
        first = ANALYSIS.deterministic_sample(items, 12, 42)
        second = ANALYSIS.deterministic_sample(items, 12, 42)

        self.assertEqual(first, second)
        self.assertEqual(len(first), 12)

    def test_pca_and_outlier_analysis_return_finite_values(self):
        matrix = np.asarray(
            [
                [1.0, 0.0, 0.0, 0.0],
                [0.95, 0.05, 0.0, 0.0],
                [0.9, 0.1, 0.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ]
        )
        items = [
            {"label": f"item-{index}", "category": "A", "kind": "probe-known"}
            for index in range(4)
        ]

        points, explained = ANALYSIS.compute_pca(matrix)
        outliers = ANALYSIS.compute_outliers(items, matrix)

        self.assertEqual(points.shape, (4, 2))
        self.assertTrue(np.isfinite(points).all())
        self.assertTrue(np.isfinite(explained).all())
        self.assertEqual(outliers[0]["label"], "item-3")
        self.assertGreater(outliers[0]["distance"], outliers[-1]["distance"])

    def test_pca_rejects_embeddings_without_variance(self):
        matrix = np.ones((4, 8), dtype=float)

        with self.assertRaisesRegex(ValueError, "varianza suficiente"):
            ANALYSIS.compute_pca(matrix)

    def test_probe_result_is_labeled_as_top1_retrieval(self):
        correct = {"isKnown": True, "identity": "A", "top1": {"identity": "A"}}
        incorrect = {"isKnown": True, "identity": "A", "top1": {"identity": "B"}}

        self.assertEqual(ANALYSIS.probe_result(correct), "top1-correcto")
        self.assertEqual(ANALYSIS.probe_result(incorrect), "top1-incorrecto")
        self.assertEqual(ANALYSIS.probe_result({"isKnown": False}), "impostor")

    def test_format_number_does_not_return_untrusted_strings(self):
        self.assertEqual(ANALYSIS.format_number("<script>"), "-")
        self.assertEqual(ANALYSIS.format_number(float("nan")), "-")
        self.assertEqual(ANALYSIS.format_number(0.5), "0.500000")


if __name__ == "__main__":
    unittest.main()
