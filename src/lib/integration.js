// Why: Delegate to the centralized Service layer to maintain backward compatibility for existing callers.
// Following the Clean Architecture refactoring, the core integration workflow now resides in the services directory.

import { performFullAnalysis }  from '../services/analysis.service';

export {performFullAnalysis};
