import os
import pytest
from app.services.parser import PDFStructuredParser

def test_pdf_structured_parser(tmp_path):
    # Prepare a small sample PDF file for testing
    # For the sake of this test, we assume a file 'sample_annual_report.pdf' is present in the test directory
    sample_pdf = os.path.join(os.path.dirname(__file__), 'sample_annual_report.pdf')
    assert os.path.exists(sample_pdf), "Sample PDF for testing is missing."

    parser = PDFStructuredParser(sample_pdf)
    output = parser.parse()

    # Output file should be created
    basename = os.path.splitext(os.path.basename(sample_pdf))[0]
    structured_path = os.path.join(os.path.dirname(__file__), '../data/outputs/structured', f'{basename}.json')
    assert os.path.exists(structured_path)

    # Basic structure assertions
    assert 'pages' in output
    assert isinstance(output['pages'], list)
    found_table_or_paragraph = False
    for page in output['pages']:
        assert 'page_num' in page
        assert 'elements' in page
        for element in page['elements']:
            assert 'type' in element
            if element['type'] in ('table', 'paragraph'):
                found_table_or_paragraph = True
    assert found_table_or_paragraph, "No table or paragraph found in parsed output."
