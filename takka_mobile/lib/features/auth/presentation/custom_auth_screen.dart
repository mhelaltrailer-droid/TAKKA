import 'package:clerk_auth/clerk_auth.dart' as clerk;
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/validation/phone.dart';

enum AuthMode { signIn, signUp, forgotPassword }

/// Custom Arabic auth UI mirrored with web (`admin` sign-in / sign-up forms).
class CustomAuthScreen extends StatefulWidget {
  const CustomAuthScreen({
    super.key,
    this.initialMode = AuthMode.signIn,
  });

  final AuthMode initialMode;

  @override
  State<CustomAuthScreen> createState() => _CustomAuthScreenState();
}

class _CustomAuthScreenState extends State<CustomAuthScreen> {
  late AuthMode _mode;
  var _step = _SignUpStep.details;
  var _forgotStep = _ForgotStep.email;

  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _codeController = TextEditingController();

  String? _error;
  String? _info;
  var _isSubmitting = false;
  var _obscurePassword = true;
  var _obscureConfirmPassword = true;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  void _switchMode(AuthMode mode) {
    setState(() {
      _mode = mode;
      _step = _SignUpStep.details;
      _forgotStep = _ForgotStep.email;
      _error = null;
      _info = null;
      _codeController.clear();
      _confirmPasswordController.clear();
      if (mode != AuthMode.signIn) {
        _passwordController.clear();
      }
    });
  }

  Future<void> _submitSignIn() async {
    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _isSubmitting = true;
      _error = null;
      _info = null;
    });

    try {
      await authState.safelyCall(
        context,
        () async {
          await authState.attemptSignIn(
            strategy: clerk.Strategy.password,
            identifier: _emailController.text.trim(),
            password: _passwordController.text,
          );
        },
        onError: (error) {
          if (mounted) {
            setState(() => _error = error.message);
          }
        },
      );

      if (!mounted) return;
      if (authState.user != null) {
        Navigator.of(context).pop();
      } else if (_error == null) {
        setState(() => _error = 'تعذر إكمال تسجيل الدخول.');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _submitForgotEmail() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'أدخل بريدًا إلكترونيًا صالحًا.');
      return;
    }

    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _isSubmitting = true;
      _error = null;
      _info = null;
    });

    try {
      await authState.safelyCall(
        context,
        () async {
          await authState.initiatePasswordReset(
            identifier: email,
            strategy: clerk.Strategy.resetPasswordEmailCode,
          );
        },
        onError: (error) {
          if (mounted) {
            setState(() => _error = error.message);
          }
        },
      );

      if (!mounted) return;
      if (_error != null) {
        return;
      }

      setState(() {
        _forgotStep = _ForgotStep.reset;
        _info = 'أرسلنا رمز إعادة التعيين إلى بريدك الإلكتروني.';
        _codeController.clear();
        _passwordController.clear();
        _confirmPasswordController.clear();
      });
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _submitForgotReset() async {
    final password = _passwordController.text;
    final confirm = _confirmPasswordController.text;
    final code = _codeController.text.trim();

    if (code.isEmpty) {
      setState(() => _error = 'أدخل رمز التأكيد.');
      return;
    }
    if (password.length < 15) {
      setState(() => _error = 'كلمة المرور يجب أن تكون 15 حرفًا على الأقل.');
      return;
    }
    if (password != confirm) {
      setState(() => _error = 'تأكيد كلمة المرور غير متطابق.');
      return;
    }

    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _isSubmitting = true;
      _error = null;
      _info = null;
    });

    try {
      await authState.safelyCall(
        context,
        () async {
          await authState.attemptSignIn(
            strategy: clerk.Strategy.resetPasswordEmailCode,
            identifier: _emailController.text.trim(),
            password: password,
            code: code,
          );
        },
        onError: (error) {
          if (mounted) {
            setState(() => _error = error.message);
          }
        },
      );

      if (!mounted) return;
      if (authState.user != null) {
        Navigator.of(context).pop();
      } else if (_error == null) {
        setState(() => _error = 'تعذر إكمال إعادة تعيين كلمة المرور.');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _submitSignUpDetails() async {
    final phoneError = phoneValidationMessage(_phoneController.text);
    if (phoneError != null) {
      setState(() => _error = phoneError);
      return;
    }

    final fullName = _fullNameController.text.trim();
    if (fullName.length < 3) {
      setState(() => _error = 'الاسم مطلوب بالكامل.');
      return;
    }

    final password = _passwordController.text;
    if (password.length < 15) {
      setState(() => _error = 'كلمة المرور يجب أن تكون 15 حرفًا على الأقل.');
      return;
    }

    final parts = fullName.split(RegExp(r'\s+'));
    final firstName = parts.first;
    final lastName = parts.length > 1 ? parts.sublist(1).join(' ') : '-';
    final localPhone = normalizePhone(_phoneController.text);

    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await authState.safelyCall(
        context,
        () async {
          await authState.attemptSignUp(
            strategy: clerk.Strategy.password,
            emailAddress: _emailController.text.trim(),
            password: password,
            passwordConfirmation: password,
            firstName: firstName,
            lastName: lastName,
            metadata: {'egyptianPhone': localPhone},
          );

          if (authState.signUp?.unverified(clerk.Field.emailAddress) == true) {
            await authState.attemptSignUp(strategy: clerk.Strategy.emailCode);
          }
        },
        onError: (error) {
          if (mounted) {
            setState(() => _error = error.message);
          }
        },
      );

      if (!mounted) return;
      if (authState.user != null) {
        Navigator.of(context).pop();
        return;
      }

      if (_error == null) {
        setState(() => _step = _SignUpStep.verify);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _submitVerification() async {
    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await authState.safelyCall(
        context,
        () async {
          await authState.attemptSignUp(
            strategy: clerk.Strategy.emailCode,
            code: _codeController.text.trim(),
          );
        },
        onError: (error) {
          if (mounted) {
            setState(() => _error = error.message);
          }
        },
      );

      if (!mounted) return;
      if (authState.user != null) {
        Navigator.of(context).pop();
      } else if (_error == null) {
        setState(() {
          _error = 'لم يكتمل التحقق بعد. تأكد من الرمز وحاول مجددًا.';
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isSignUp = _mode == AuthMode.signUp;
    final isForgot = _mode == AuthMode.forgotPassword;
    final showingVerify = isSignUp && _step == _SignUpStep.verify;
    final showingForgotReset = isForgot && _forgotStep == _ForgotStep.reset;

    final title = showingVerify
        ? 'تأكيد الحساب'
        : showingForgotReset
            ? 'تعيين كلمة مرور جديدة'
            : isForgot
                ? 'نسيت كلمة المرور'
                : isSignUp
                    ? 'إنشاء حساب'
                    : 'تسجيل الدخول';

    final subtitle = showingVerify
        ? 'أرسلنا رمز التأكيد إلى بريدك الإلكتروني. أدخله لإكمال إنشاء الحساب.'
        : showingForgotReset
            ? 'أدخل الرمز المرسل إلى ${_emailController.text.trim()} ثم اختر كلمة مرور جديدة.'
            : isForgot
                ? 'أدخل بريدك الإلكتروني وسنرسل رمزًا لإعادة تعيين كلمة المرور.'
                : isSignUp
                    ? 'أدخل رقم هاتفك والاسم والإيميل. رمز التأكيد سيصل على البريد الإلكتروني.'
                    : 'ادخل بالإيميل وكلمة المرور لمتابعة طلباتك أو إدارة مطبخك.';

    return Scaffold(
      backgroundColor: TakkaColors.cream,
      appBar: AppBar(
        backgroundColor: TakkaColors.cream,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        subtitle,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: TakkaColors.muted,
                          height: 1.65,
                        ),
                      ),
                      const SizedBox(height: 22),
                      if (showingVerify)
                        ..._buildVerifyFields()
                      else if (showingForgotReset)
                        ..._buildForgotResetFields()
                      else if (isForgot)
                        ..._buildForgotEmailFields()
                      else if (isSignUp)
                        ..._buildSignUpFields()
                      else
                        ..._buildSignInFields(),
                      if (_info != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _info!,
                          style: const TextStyle(
                            color: Color(0xFF2E7D32),
                            height: 1.45,
                          ),
                        ),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: const TextStyle(
                            color: Color(0xFFC62828),
                            height: 1.45,
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      FilledButton(
                        onPressed: _isSubmitting
                            ? null
                            : () {
                                if (showingVerify) {
                                  _submitVerification();
                                } else if (showingForgotReset) {
                                  _submitForgotReset();
                                } else if (isForgot) {
                                  _submitForgotEmail();
                                } else if (isSignUp) {
                                  _submitSignUpDetails();
                                } else {
                                  _submitSignIn();
                                }
                              },
                        child: Text(
                          _isSubmitting
                              ? (showingVerify || showingForgotReset
                                  ? 'جارٍ التحقق...'
                                  : isForgot
                                      ? 'جارٍ الإرسال...'
                                      : isSignUp
                                          ? 'جارٍ إنشاء الحساب...'
                                          : 'جارٍ الدخول...')
                              : (showingVerify
                                  ? 'تأكيد الحساب'
                                  : showingForgotReset
                                      ? 'تعيين كلمة المرور'
                                      : isForgot
                                          ? 'إرسال رمز إعادة التعيين'
                                          : isSignUp
                                              ? 'متابعة'
                                              : 'تسجيل الدخول'),
                        ),
                      ),
                      if (!showingVerify) ...[
                        const SizedBox(height: 16),
                        if (isForgot)
                          TextButton(
                            onPressed: _isSubmitting
                                ? null
                                : () => _switchMode(AuthMode.signIn),
                            child: const Text(
                              'العودة لتسجيل الدخول',
                              style: TextStyle(fontWeight: FontWeight.w800),
                            ),
                          )
                        else
                          Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                isSignUp
                                    ? 'لديك حساب بالفعل؟ '
                                    : 'ليس لديك حساب؟ ',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: TakkaColors.muted,
                                ),
                              ),
                              TextButton(
                                onPressed: _isSubmitting
                                    ? null
                                    : () => _switchMode(
                                          isSignUp
                                              ? AuthMode.signIn
                                              : AuthMode.signUp,
                                        ),
                                style: TextButton.styleFrom(
                                  foregroundColor: TakkaColors.secondary,
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  isSignUp ? 'تسجيل الدخول' : 'إنشاء حساب',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildSignInFields() {
    return [
      _LabeledField(
        label: 'البريد الإلكتروني',
        child: TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(hintText: 'name@email.com'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'كلمة المرور',
        child: TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) {
            if (!_isSubmitting) _submitSignIn();
          },
          decoration: InputDecoration(
            suffixIcon: IconButton(
              tooltip: _obscurePassword ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور',
              onPressed: () {
                setState(() => _obscurePassword = !_obscurePassword);
              },
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
            ),
          ),
        ),
      ),
      Align(
        alignment: AlignmentDirectional.centerStart,
        child: TextButton(
          onPressed: _isSubmitting
              ? null
              : () => _switchMode(AuthMode.forgotPassword),
          style: TextButton.styleFrom(
            foregroundColor: TakkaColors.secondary,
            padding: const EdgeInsets.only(top: 8),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: const Text(
            'نسيت كلمة المرور؟',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildForgotEmailFields() {
    return [
      _LabeledField(
        label: 'البريد الإلكتروني',
        child: TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(hintText: 'name@email.com'),
          onSubmitted: (_) {
            if (!_isSubmitting) _submitForgotEmail();
          },
        ),
      ),
    ];
  }

  List<Widget> _buildForgotResetFields() {
    return [
      _LabeledField(
        label: 'رمز التأكيد',
        child: TextField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.next,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(hintText: '123456'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'كلمة المرور الجديدة',
        child: TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            hintText: '15 حرفًا على الأقل',
            suffixIcon: IconButton(
              tooltip:
                  _obscurePassword ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور',
              onPressed: () {
                setState(() => _obscurePassword = !_obscurePassword);
              },
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
            ),
          ),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'تأكيد كلمة المرور',
        child: TextField(
          controller: _confirmPasswordController,
          obscureText: _obscureConfirmPassword,
          textInputAction: TextInputAction.done,
          decoration: InputDecoration(
            suffixIcon: IconButton(
              tooltip: _obscureConfirmPassword
                  ? 'إظهار كلمة المرور'
                  : 'إخفاء كلمة المرور',
              onPressed: () {
                setState(
                  () => _obscureConfirmPassword = !_obscureConfirmPassword,
                );
              },
              icon: Icon(
                _obscureConfirmPassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
            ),
          ),
          onSubmitted: (_) {
            if (!_isSubmitting) _submitForgotReset();
          },
        ),
      ),
    ];
  }

  List<Widget> _buildSignUpFields() {
    return [
      _LabeledField(
        label: 'الاسم الكامل',
        child: TextField(
          controller: _fullNameController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(hintText: '(الاسم +اللقب)'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'رقم الهاتف',
        child: TextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.next,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(11),
          ],
          decoration: const InputDecoration(hintText: '01*********'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'البريد الإلكتروني',
        child: TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(hintText: 'name@email.com'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'كلمة المرور',
        child: TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.done,
          decoration: InputDecoration(
            hintText: '15 حرفًا على الأقل',
            suffixIcon: IconButton(
              tooltip: _obscurePassword ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور',
              onPressed: () {
                setState(() => _obscurePassword = !_obscurePassword);
              },
              icon: Icon(
                _obscurePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
            ),
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildVerifyFields() {
    return [
      _LabeledField(
        label: 'رمز التأكيد',
        child: TextField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(hintText: '123456'),
          onSubmitted: (_) {
            if (!_isSubmitting) _submitVerification();
          },
        ),
      ),
    ];
  }
}

enum _SignUpStep { details, verify }

enum _ForgotStep { email, reset }

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}
