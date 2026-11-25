# TAURUS Python App Package
import starlette.templating

# Patch Starlette Jinja2Templates for seamless backward compatibility
_orig_template_response = starlette.templating.Jinja2Templates.TemplateResponse

def _patched_template_response(self, *args, **kwargs):
    if len(args) >= 2 and isinstance(args[0], str) and isinstance(args[1], dict):
        name = args[0]
        context = args[1]
        req = kwargs.pop('request', context.get('request'))
        return _orig_template_response(self, request=req, name=name, context=context, **kwargs)
    elif 'name' in kwargs and 'context' in kwargs and 'request' not in kwargs:
        req = kwargs['context'].get('request')
        return _orig_template_response(self, request=req, **kwargs)
    return _orig_template_response(self, *args, **kwargs)

starlette.templating.Jinja2Templates.TemplateResponse = _patched_template_response
